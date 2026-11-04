import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  getAllSubscriptions, 
  saveSubscription, 
  deleteSubscription, 
  advanceSubscriptionPayment,
  syncOverdueCycles,
  cloneSubscription,
  getSettings,
  saveSettings
} from './db.js';
import { convertToINR, parsePrice, updateRates } from './currency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// Gemini AI Configuration & Helpers
// ----------------------------------------------------

export const CURATED_GEMINI_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Configured Default for Subscriptions)', description: 'Flagship reasoning and analysis model for deep financial insights' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash-Lite Latest (Recommended - Quota-Free)', description: 'Ultra fast, generous rate limits, zero daily quota bottlenecks' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Lightweight rapid response production model' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Flagship reasoning model' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', description: 'Dynamic pointer that always uses newest Flash version' },
  { id: 'gemini-pro-latest', name: 'Gemini Pro Latest', description: 'Dynamic pointer for newest Gemini Pro' }
];

function sanitizeModelName(modelName) {
  const invalid = ['gemini-3.5-pro', 'gemini-3.8-pro', 'gemini-2.5-flash-lite'];
  if (!modelName || invalid.includes(modelName)) {
    return 'gemini-2.5-pro';
  }
  return modelName;
}

// Generate content with automatic failover cascade for rate-limits (429) or transient 503s
async function generateGeminiContentWithRetry(apiKey, primaryModel, contents, options = {}, maxRetries = 1) {
  const chosen = sanitizeModelName(primaryModel || 'gemini-2.5-pro');
  
  // Ordered fallback cascade: chosen -> gemini-flash-lite-latest -> gemini-3.1-flash-lite -> gemini-flash-latest
  const candidateModels = [
    chosen,
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelToTry of candidateModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini AI] Querying model: ${modelToTry} (attempt ${attempt + 1}/${maxRetries + 1})`);
        const generativeModel = genAI.getGenerativeModel({
          model: modelToTry,
          ...options
        });
        const result = await generativeModel.generateContent(contents);
        return { result, modelUsed: modelToTry };
      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        const isQuotaOrLimit = msg.includes('429') || msg.includes('quota') || msg.includes('exceeded your current quota');
        const isNotFound = msg.includes('404') || msg.includes('not found') || msg.includes('is no longer available');
        const isTransient = msg.includes('503') || msg.includes('high demand') || msg.includes('fetch failed');

        if (isNotFound || isQuotaOrLimit) {
          console.warn(`[Gemini AI] Model ${modelToTry} unavailable (${isNotFound ? '404 not found' : '429 quota'}). Failing over to next candidate...`);
          break; // Break inner loop to try next model immediately
        }

        if (isTransient && attempt < maxRetries) {
          console.warn(`[Gemini AI] Model ${modelToTry} busy. Waiting before retry...`);
          await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }

        console.warn(`[Gemini AI] Model ${modelToTry} failed (${msg.substring(0, 100)}). Trying fallback model...`);
        break;
      }
    }
  }

  throw lastError;
}

// ----------------------------------------------------
// Notification Helpers: Gotify & Nodemailer
// ----------------------------------------------------

export function formatGotifyUrl(url) {
  if (!url) return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

export async function sendGotifyNotification(config, title, message, priority = 5) {
  const url = formatGotifyUrl(config?.gotifyUrl);
  const token = (config?.gotifyToken || '').trim();

  if (!url) throw new Error('Gotify Server URL is not configured.');
  if (!token) throw new Error('Gotify App Token is not configured.');

  const endpoint = `${url}/message`;
  console.log(`[Gotify] Dispatching push notification to ${endpoint}`);

  const res = await axios.post(
    endpoint,
    {
      title: title || 'Subscriptions Alert',
      message: message,
      priority: parseInt(priority) || 5
    },
    {
      headers: {
        'X-Gotify-Key': token,
        'Content-Type': 'application/json'
      },
      timeout: 12000
    }
  );
  return res.data;
}

export async function sendEmailNotification(config, subject, text, to) {
  if (!config.smtpHost || !config.smtpUser) {
    throw new Error('SMTP Host and SMTP User must be configured.');
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost.trim(),
    port: parseInt(config.smtpPort) || 587,
    secure: parseInt(config.smtpPort) === 465,
    auth: {
      user: config.smtpUser.trim(),
      pass: (config.smtpPass || '').trim(),
    },
  });

  const recipient = (to || config.testRecipient || config.smtpUser).trim();
  const info = await transporter.sendMail({
    from: config.smtpFrom || config.smtpUser,
    to: recipient,
    subject: subject,
    text: text,
  });

  console.log(`[Email] Notification sent to ${recipient}: ${info.messageId}`);
  return info;
}

// ----------------------------------------------------
// Daily Reminder Check Logic
// ----------------------------------------------------

export async function runDailyReminderCheck() {
  const startTime = new Date();
  console.log(`[Reminder] Executing reminder check at ${startTime.toISOString()}`);
  
  const settings = await getSettings();
  if (settings.notificationsEnabled === false) {
    console.log('[Reminder] Notifications disabled in settings.');
    return { success: false, message: 'Notifications are disabled in settings.' };
  }

  const subs = await getAllSubscriptions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alertDaysAhead = parseInt(settings.alertDaysAhead) || 3;

  const overdue = [];
  const dueToday = [];
  const dueSoon = [];

  for (const sub of subs) {
    if (!sub['Next Payment'] || sub.Active !== 'Yes') continue;
    const dueDate = new Date(sub['Next Payment']);
    dueDate.setHours(0, 0, 0, 0);

    if (isNaN(dueDate.getTime())) continue;

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      overdue.push({ ...sub, diffDays });
    } else if (diffDays === 0) {
      dueToday.push({ ...sub, diffDays: 0 });
    } else if (diffDays <= alertDaysAhead) {
      dueSoon.push({ ...sub, diffDays });
    }
  }

  console.log(`[Reminder] Counts: Overdue=${overdue.length}, DueToday=${dueToday.length}, DueSoon=${dueSoon.length}`);

  const hasItemsToNotify = 
    dueToday.length > 0 || 
    dueSoon.length > 0 || 
    (settings.notifyOnOverdue !== false && overdue.length > 0) ||
    settings.dailyDigest === true;

  if (!hasItemsToNotify) {
    const summary = `No subscriptions due in the next ${alertDaysAhead} days.`;
    await saveSettings({
      lastDailyCheck: new Date().toISOString(),
      lastDailyCheckResult: summary
    });
    return { success: true, message: summary, count: 0 };
  }

  // Construct message
  let notificationTitle = '💳 Subscriptions Due Alert';
  if (overdue.length > 0) {
    notificationTitle = `⚠️ Subscriptions Alert: ${overdue.length} Overdue`;
  } else if (dueToday.length > 0) {
    notificationTitle = `🔔 Subscriptions Alert: ${dueToday.length} Due Today`;
  }

  let bodyLines = [];
  if (overdue.length > 0 && settings.notifyOnOverdue !== false) {
    bodyLines.push(`🔴 OVERDUE (${overdue.length}):`);
    overdue.forEach(s => bodyLines.push(`• ${s.Name}: ${s.Price} (Due: ${s['Next Payment']}, ${Math.abs(s.diffDays)}d ago)`));
  }
  if (dueToday.length > 0) {
    bodyLines.push(`\n🟡 DUE TODAY (${dueToday.length}):`);
    dueToday.forEach(s => bodyLines.push(`• ${s.Name}: ${s.Price}`));
  }
  if (dueSoon.length > 0) {
    bodyLines.push(`\n🔵 UPCOMING NEXT ${alertDaysAhead} DAYS (${dueSoon.length}):`);
    dueSoon.forEach(s => bodyLines.push(`• ${s.Name}: ${s.Price} (Due: ${s['Next Payment']}, in ${s.diffDays}d)`));
  }

  let messageText = bodyLines.join('\n').trim();

  // Gemini AI summary enhancement
  const geminiApiKey = (settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  if (geminiApiKey) {
    try {
      console.log('[Reminder] Generating concise notification summary via Gemini AI...');
      const prompt = `
You are an executive personal finance assistant.
Summarize the following subscription payments for a push notification and email.
Be concise, polite, professional, and clear. State the total items, highlight any overdue bills urgently, and list each item with its price and due date clearly.

Subscriptions Data:
${messageText}
`;
      const { result, modelUsed } = await generateGeminiContentWithRetry(
        geminiApiKey,
        settings.geminiModel || 'gemini-2.5-pro',
        prompt,
        { generationConfig: { temperature: 0.2 } }
      );
      const aiSummary = result?.response?.text();
      if (aiSummary && aiSummary.trim().length > 10) {
        messageText = `${aiSummary.trim()}\n\n---\n${messageText}`;
        console.log(`[Reminder] Gemini AI summary generated using ${modelUsed}`);
      }
    } catch (aiErr) {
      console.warn('[Reminder] Gemini AI summary failed, using standard format:', aiErr.message);
    }
  }

  let sentGotify = false;
  let sentEmail = false;
  let errorMessages = [];

  // Gotify Dispatch
  if (settings.gotifyUrl && settings.gotifyToken) {
    try {
      const priority = overdue.length > 0 ? 7 : 5;
      await sendGotifyNotification(settings, notificationTitle, messageText, priority);
      sentGotify = true;
    } catch (gotifyErr) {
      console.error('[Reminder] Gotify delivery error:', gotifyErr.message);
      errorMessages.push(`Gotify: ${gotifyErr.message}`);
    }
  }

  // Email Dispatch
  if (settings.smtpHost && settings.smtpUser) {
    try {
      await sendEmailNotification(settings, notificationTitle, messageText);
      sentEmail = true;
    } catch (emailErr) {
      console.error('[Reminder] SMTP delivery error:', emailErr.message);
      errorMessages.push(`SMTP: ${emailErr.message}`);
    }
  }

  const resultStatus = `Check completed: ${overdue.length} overdue, ${dueToday.length} today, ${dueSoon.length} soon. Sent: Gotify=${sentGotify}, Email=${sentEmail}.${errorMessages.length ? ` Errors: ${errorMessages.join(', ')}` : ''}`;

  await saveSettings({
    lastDailyCheck: new Date().toISOString(),
    lastDailyCheckResult: resultStatus
  });

  return {
    success: true,
    message: resultStatus,
    overdueCount: overdue.length,
    dueTodayCount: dueToday.length,
    dueSoonCount: dueSoon.length,
    sentGotify,
    sentEmail,
    errors: errorMessages
  };
}

// ----------------------------------------------------
// Cron Scheduler
// ----------------------------------------------------

let dailyReminderJob = null;

export function scheduleDailyReminder() {
  if (dailyReminderJob) {
    dailyReminderJob.stop();
    dailyReminderJob = null;
  }

  getSettings().then(settings => {
    const time = settings.dailyCheckTime || '09:00';
    const [hourStr, minStr] = time.split(':');
    const hour = parseInt(hourStr) || 9;
    const minute = parseInt(minStr) || 0;
    const cronExpression = `${minute} ${hour} * * *`;

    try {
      dailyReminderJob = cron.schedule(cronExpression, async () => {
        console.log(`[Cron] Firing daily subscription reminder check at ${new Date().toISOString()}`);
        try {
          await runDailyReminderCheck();
        } catch (cronErr) {
          console.error('[Cron] Error during daily check execution:', cronErr);
        }
      });
      console.log(`[Cron] Daily reminder job scheduled for ${time} (${cronExpression})`);
    } catch (err) {
      console.error('[Cron] Failed to schedule cron job:', err.message);
    }
  });
}

// ----------------------------------------------------
// API Routes: Gemini AI
// ----------------------------------------------------

// List Available Models
app.get('/api/gemini/models', async (req, res) => {
  const settings = await getSettings();
  const apiKey = (req.query.apiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.json({ models: CURATED_GEMINI_MODELS, source: 'curated' });
  }

  try {
    const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
      params: { key: apiKey },
      timeout: 8000
    });

    if (response.data && Array.isArray(response.data.models)) {
      const validModels = response.data.models
        .filter(m => {
          const id = (m.name || '').replace(/^models\//, '');
          const methods = m.supportedGenerationMethods || [];
          return (
            methods.includes('generateContent') &&
            !id.includes('embedding') &&
            !id.includes('aqa') &&
            !id.includes('imagen') &&
            !id.includes('learnlm')
          );
        })
        .map(m => {
          const id = m.name.replace(/^models\//, '');
          return {
            id,
            name: m.displayName || id,
            description: m.description ? m.description.substring(0, 140) : 'Google Gemini model'
          };
        });

      if (validModels.length > 0) {
        // Prioritize gemini-2.5-pro, gemini-flash-lite-latest, gemini-3.1-flash-lite
        validModels.sort((a, b) => {
          if (a.id === 'gemini-2.5-pro') return -1;
          if (b.id === 'gemini-2.5-pro') return 1;
          if (a.id === 'gemini-flash-lite-latest') return -1;
          if (b.id === 'gemini-flash-lite-latest') return 1;
          if (a.id === 'gemini-3.1-flash-lite') return -1;
          if (b.id === 'gemini-3.1-flash-lite') return 1;
          return a.id.localeCompare(b.id);
        });

        return res.json({ models: validModels, source: 'live' });
      }
    }

    return res.json({ models: CURATED_GEMINI_MODELS, source: 'curated' });
  } catch (error) {
    console.warn(`[Gemini API] Failed to fetch live models (${error.message}). Using curated list.`);
    return res.json({ models: CURATED_GEMINI_MODELS, source: 'curated' });
  }
});

// Test Gemini Connection
app.post('/api/test/gemini', async (req, res) => {
  try {
    const settings = await getSettings();
    const apiKey = (req.body?.apiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
    const model = req.body?.model || settings.geminiModel || 'gemini-2.5-pro';

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is required for testing.' });
    }

    const { result, modelUsed } = await generateGeminiContentWithRetry(
      apiKey,
      model,
      'Respond with a 1-sentence confirmation that Google Gemini AI is connected and ready.',
      { generationConfig: { temperature: 0.1 } }
    );

    const reply = result.response.text();
    res.json({
      success: true,
      modelUsed,
      message: reply.trim()
    });
  } catch (error) {
    console.error('[Test Gemini Error]:', error.message);
    res.status(500).json({ error: `Gemini AI Error: ${error.message}` });
  }
});

// AI Financial Insights Analysis
app.post('/api/ai/analyze', async (req, res) => {
  const settings = await getSettings();
  const apiKey = (req.body?.apiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  const model = req.body?.model || settings.geminiModel || 'gemini-2.5-pro';

  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API Key is not configured. Please add your key in Settings.' });
  }

  try {
    const subs = await getAllSubscriptions();
    const activeSubs = subs.filter(s => s.Active === 'Yes');

    if (activeSubs.length === 0) {
      return res.json({ analysis: 'No active subscriptions found to analyze.' });
    }

    const prompt = `
You are a premier financial strategist analyzing recurring subscriptions and bills.
Here is the active subscription portfolio:
${JSON.stringify(activeSubs.map(s => ({
  name: s.Name,
  price: s.Price,
  cycle: s['Payment Cycle'],
  category: s.Category,
  paymentMethod: s['Payment Method'],
  nextPayment: s['Next Payment']
})), null, 2)}

Provide a comprehensive, highly actionable financial review formatted in clean, professional GitHub Flavored Markdown:

### 1. 📊 Portfolio Spending Overview
- Monthly and annual expenditure totals and category distribution summary.
- Balance check across Entertainment, Utilities, Insurance, and Services.

### 2. 💡 High-Impact Cost Reductions (Top 3-5 Recommendations)
- Specific services to scrutinize, renegotiate, downgrade, or cancel.
- Duplicate or overlapping service warnings.

### 3. 🎯 Optimization Strategies
- Annual vs Monthly discount savings opportunities.
- Bundles, family sharing, or alternative tier advice.

### 4. ⚡ Next Action Item
- A single, highest-leverage immediate action the user should take today.
`;

    const { result, modelUsed } = await generateGeminiContentWithRetry(
      apiKey,
      model,
      prompt,
      { generationConfig: { temperature: 0.2 } }
    );

    const analysis = result.response.text();
    res.json({ analysis, modelUsed });
  } catch (error) {
    console.error('[AI Analyze Error]:', error);
    res.status(500).json({ error: `AI Analysis failed: ${error.message}` });
  }
});

// AI Natural Language Subscription Parser
app.post('/api/ai/create-subscription', async (req, res) => {
  const settings = await getSettings();
  const apiKey = (settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  const model = settings.geminiModel || 'gemini-2.5-pro';

  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API Key is not configured in Settings.' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Subscription description text is required.' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const systemPrompt = `
You are an expert AI parser for a subscription manager.
Today's date is ${todayStr}.
Extract subscription information from the user prompt into a structured JSON object.
Rules:
- "Name": Service or bill name (e.g., "Netflix", "Jio Postpaid", "Gym").
- "Price": Formatted price with symbol (e.g., "₹649", "$15.99", "£25"). Detect the appropriate currency symbol.
- "Payment Cycle": Must be one of: "Monthly", "Quarterly", "Every 6 Months", "Yearly", "Weekly", "Bi-Weekly", "One-Time". Default to "Monthly".
- "Next Payment": ISO date string "YYYY-MM-DD". If a day is mentioned (e.g., "on 15th"), calculate the next upcoming occurrence relative to today (${todayStr}).
- "Category": Choose best match from: "Entertainment", "Utilities", "Productivity", "Health & Fitness", "Housing", "Insurance", "Shopping", "Food & Drink", "Transportation", "Education", "Other".
- "Payment Method": Choose best match from: "Credit Card", "Debit Card", "Direct Debit", "UPI", "PayPal", "Bank Transfer", "Other". Default "Credit Card".
- "Renewal": "Automatic" or "Manual". Default "Automatic".
- "Notes": Any extra notes or URL mentioned.
- "Active": "Yes".

Return ONLY raw JSON conforming to this schema. No markdown backticks.
`;

  try {
    const { result, modelUsed } = await generateGeminiContentWithRetry(
      apiKey,
      model,
      text,
      {
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      }
    );

    const raw = result.response.text();
    const parsed = JSON.parse(raw);

    // Apply fallbacks
    if (!parsed.Name) parsed.Name = text.substring(0, 30);
    if (!parsed.Price) parsed.Price = '₹0';
    if (!parsed['Payment Cycle']) parsed['Payment Cycle'] = 'Monthly';
    if (!parsed['Next Payment']) parsed['Next Payment'] = todayStr;
    if (!parsed.Category) parsed.Category = 'Utilities';
    if (!parsed.Active) parsed.Active = 'Yes';
    if (!parsed.Renewal) parsed.Renewal = 'Automatic';

    res.json({ subscription: parsed, modelUsed });
  } catch (error) {
    console.error('[AI Create Subscription Error]:', error);
    res.status(500).json({ error: `Failed to parse subscription: ${error.message}` });
  }
});

// ----------------------------------------------------
// API Routes: Subscriptions (No Auth)
// ----------------------------------------------------

// Get All Subscriptions & Stats
app.get('/api/subscriptions', async (req, res) => {
  try {
    const subs = await getAllSubscriptions();

    let totalMonthlyINR = 0;
    let totalYearlyINR = 0;
    const categoryStats = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let dueThisMonth = 0;
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const enrichedSubs = subs.map(sub => {
      const { value, currency } = parsePrice(sub.Price);
      const valueINR = convertToINR(sub.Price);

      let monthlyCost = 0;
      let yearlyCost = 0;

      switch (sub['Payment Cycle']) {
        case 'Weekly':
          monthlyCost = (valueINR * 52) / 12;
          yearlyCost = valueINR * 52;
          break;
        case 'Bi-Weekly':
          monthlyCost = (valueINR * 26) / 12;
          yearlyCost = valueINR * 26;
          break;
        case 'Monthly':
          monthlyCost = valueINR;
          yearlyCost = valueINR * 12;
          break;
        case 'Quarterly':
          monthlyCost = valueINR / 3;
          yearlyCost = valueINR * 4;
          break;
        case 'Every 6 Months':
          monthlyCost = valueINR / 6;
          yearlyCost = valueINR * 2;
          break;
        case 'Yearly':
          monthlyCost = valueINR / 12;
          yearlyCost = valueINR;
          break;
        case 'One-Time':
          monthlyCost = 0;
          yearlyCost = valueINR;
          break;
        default:
          monthlyCost = valueINR;
          yearlyCost = valueINR * 12;
          break;
      }

      if (sub.Active === 'Yes') {
        totalMonthlyINR += monthlyCost;
        totalYearlyINR += yearlyCost;

        const cat = sub.Category || 'Uncategorized';
        categoryStats[cat] = (categoryStats[cat] || 0) + monthlyCost;

        if (sub['Next Payment']) {
          const dueDate = new Date(sub['Next Payment']);
          dueDate.setHours(0, 0, 0, 0);

          if (!isNaN(dueDate.getTime())) {
            if (dueDate.getTime() < today.getTime()) {
              overdueCount++;
            }
            if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
              dueThisMonth += valueINR;
            }
          }
        }
      }

      return {
        ...sub,
        value,
        currency,
        valueINR,
        monthlyCost,
        yearlyCost
      };
    });

    const activeSubs = enrichedSubs.filter(s => s.Active === 'Yes');
    const mostExpensive = activeSubs.slice().sort((a, b) => b.monthlyCost - a.monthlyCost)[0] || null;

    res.json({
      subscriptions: enrichedSubs,
      stats: {
        totalMonthlyINR,
        totalYearlyINR,
        averageMonthlyINR: activeSubs.length ? totalMonthlyINR / activeSubs.length : 0,
        dueThisMonthINR: dueThisMonth,
        overdueCount,
        activeCount: activeSubs.length,
        totalCount: subs.length,
        mostExpensive,
        categoryStats
      }
    });
  } catch (error) {
    console.error('[API Subscriptions Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Save / Upsert Subscription
app.post('/api/subscriptions', async (req, res) => {
  try {
    const saved = await saveSubscription(req.body);
    res.json(saved);
  } catch (error) {
    console.error('[API Save Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Subscription
app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    await deleteSubscription(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[API Delete Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Advance Subscription (Mark as Paid)
app.post('/api/subscriptions/:id/pay', async (req, res) => {
  try {
    const updated = await advanceSubscriptionPayment(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('[API Pay Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clone Subscription
app.post('/api/subscriptions/:id/clone', async (req, res) => {
  try {
    const cloned = await cloneSubscription(req.params.id);
    res.json(cloned);
  } catch (error) {
    console.error('[API Clone Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync Overdue Cycles to Current Cycle
app.post('/api/subscriptions/sync-cycles', async (req, res) => {
  try {
    const result = await syncOverdueCycles();
    res.json({
      success: true,
      message: `Successfully synchronized ${result.updatedCount} overdue subscriptions to upcoming billing cycles.`,
      updatedCount: result.updatedCount
    });
  } catch (error) {
    console.error('[API Sync Cycles Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// API Routes: Settings & Test Triggers
// ----------------------------------------------------

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await saveSettings(req.body);
    scheduleDailyReminder();
    res.json({ success: true, settings: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Gotify Notification
app.post('/api/test/gotify', async (req, res) => {
  try {
    const current = await getSettings();
    const config = { ...current, ...req.body };

    const subs = await getAllSubscriptions();
    const activeSubs = subs.filter(s => s.Active === 'Yes');
    const totalMonthly = activeSubs.reduce((sum, s) => sum + convertToINR(s.Price), 0);

    const message = `🔔 Subscriptions App - Gotify Test Successful!\n\nYour push notifications are configured correctly.\nActive Subscriptions: ${activeSubs.length}\nMonthly Total: ₹${totalMonthly.toFixed(0)}`;

    const result = await sendGotifyNotification(config, '🔔 Subscriptions Test', message, 6);
    res.json({ success: true, message: 'Gotify test push sent successfully!', details: result });
  } catch (error) {
    console.error('[Test Gotify Error]:', error.message);
    const detail = error.response ? ` (Status ${error.response.status}: ${JSON.stringify(error.response.data)})` : '';
    res.status(500).json({ error: `Gotify test failed: ${error.message}${detail}` });
  }
});

// Test SMTP Email
app.post('/api/test/email', async (req, res) => {
  try {
    const current = await getSettings();
    const config = { ...current, ...req.body };

    const subs = await getAllSubscriptions();
    const activeSubs = subs.filter(s => s.Active === 'Yes');

    const message = `Hello from Subscriptions App!\n\nThis confirms your SMTP email notification channel is operating correctly.\n\nActive subscriptions tracked: ${activeSubs.length}\nServer Time: ${new Date().toLocaleString()}`;

    const info = await sendEmailNotification(config, '🔔 Subscriptions Email Test', message, req.body.testRecipient);
    res.json({ success: true, message: `Test email dispatched successfully to ${info.envelope?.to?.join(', ') || 'recipient'}!` });
  } catch (error) {
    console.error('[Test Email Error]:', error.message);
    res.status(500).json({ error: `Email test failed: ${error.message}` });
  }
});

// Manual Run of Daily Reminder Check
app.post('/api/test/reminders', async (req, res) => {
  try {
    const result = await runDailyReminderCheck();
    res.json(result);
  } catch (error) {
    console.error('[Manual Check Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Companion / HomeServer Pulse API
// ----------------------------------------------------

app.get('/api/pulse/summary', async (req, res) => {
  try {
    const subs = await getAllSubscriptions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeCount = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let totalMonthlyINR = 0;

    const upcoming = [];

    subs.forEach(s => {
      if (s.Active === 'Yes') {
        activeCount++;
        totalMonthlyINR += convertToINR(s.Price);

        if (s['Next Payment']) {
          const dueDate = new Date(s['Next Payment']);
          dueDate.setHours(0, 0, 0, 0);
          if (!isNaN(dueDate.getTime())) {
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0) overdueCount++;
            else if (diffDays === 0) dueTodayCount++;
            else if (diffDays <= 7) upcoming.push({ ...s, diffDays });
          }
        }
      }
    });

    upcoming.sort((a, b) => a.diffDays - b.diffDays);

    res.json({
      status: 'ok',
      totalSubscriptions: subs.length,
      activeSubscriptions: activeCount,
      overdueCount,
      dueTodayCount,
      totalMonthlyINR: Math.round(totalMonthlyINR),
      nextUpcoming: upcoming[0] || null,
      upcomingCount7Days: upcoming.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// SPA Fallback & Server Boot
// ----------------------------------------------------

app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

cron.schedule('0 0 * * *', async () => {
  console.log('[Cron] Running daily exchange rates update...');
  await updateRates();
});

app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(`🚀 Subscriptions App Server listening on http://localhost:${PORT}`);
  console.log(`✨ Gemini AI & Gotify push services initialized`);
  console.log(`===============================================`);
  await updateRates();
  scheduleDailyReminder();
});
