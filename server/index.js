import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import axios from 'axios';
import Groq from 'groq-sdk';
import { getAllSubscriptions, saveSubscription, deleteSubscription, findUserById, saveUser } from './db.js';
import { convertToINR, parsePrice, updateRates } from './currency.js';
import authRouter from './routes/auth.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Auth Routes ---
app.use('/api/auth', authRouter);

// --- User Preferences Routes ---

app.get('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.preferences || { mode: 'light', color: 'purple' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.preferences = { ...user.preferences, ...req.body };
    await saveUser(user);
    
    res.json({ success: true, preferences: user.preferences });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- API Endpoints ---

// Get All Subscriptions & Stats
app.get('/api/subscriptions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subs = await getAllSubscriptions(userId);
    
    // Calculate stats
    let totalMonthlyINR = 0;
    let totalYearlyINR = 0;
    const categoryStats = {};

    const enrichedSubs = subs.map(sub => {
      const { value, currency } = parsePrice(sub.Price);
      const valueINR = convertToINR(sub.Price);
      
      let monthlyCost = 0;
      let yearlyCost = 0;

      if (sub['Payment Cycle'] === 'Monthly') {
        monthlyCost = valueINR;
        yearlyCost = valueINR * 12;
      } else if (sub['Payment Cycle'] === 'Yearly') {
        monthlyCost = valueINR / 12;
        yearlyCost = valueINR;
      } else if (sub['Payment Cycle'] === 'Quarterly') {
        monthlyCost = valueINR / 3;
        yearlyCost = valueINR * 4;
      }

      if (sub['Active'] === 'Yes') {
        totalMonthlyINR += monthlyCost;
        totalYearlyINR += yearlyCost;

        const cat = sub.Category || 'Uncategorized';
        if (!categoryStats[cat]) categoryStats[cat] = 0;
        categoryStats[cat] += monthlyCost;
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

    // Calculate advanced stats
    const activeSubs = enrichedSubs.filter(s => s.Active === 'Yes');
    
    // Most Expensive
    const mostExpensive = activeSubs.sort((a, b) => b.monthlyCost - a.monthlyCost)[0] || null;

    // Amount Due This Month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const dueThisMonth = activeSubs.filter(sub => {
      if (!sub['Next Payment']) return false;
      const date = new Date(sub['Next Payment']);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).reduce((sum, sub) => sum + sub.valueINR, 0);

    res.json({
      subscriptions: enrichedSubs,
      stats: {
        totalMonthlyINR,
        totalYearlyINR,
        averageMonthlyINR: enrichedSubs.length ? totalMonthlyINR / enrichedSubs.length : 0,
        mostExpensive,
        dueThisMonthINR: dueThisMonth,
        categoryStats
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Save Subscription
app.post('/api/subscriptions', authenticateToken, async (req, res) => {
  try {
    const sub = await saveSubscription(req.body, req.user.id);
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Subscription
app.delete('/api/subscriptions/:id', authenticateToken, async (req, res) => {
  try {
    await deleteSubscription(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark Subscription as Paid (Manual)
app.post('/api/subscriptions/:id/pay', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subId = req.params.id;
    
    const allSubs = await getAllSubscriptions(userId);
    const sub = allSubs.find(s => s.id === subId);

    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const currentNextPayment = new Date(sub['Next Payment']);
    let nextDate = new Date(currentNextPayment);

    switch (sub['Payment Cycle']) {
      case 'Monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'Quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'Yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        // Default to monthly if unknown
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    // Handle end-of-month edge cases (e.g., Jan 31 -> Feb 28/29)
    // Date object automatically handles rollover (Jan 31 + 1 month -> March 3 or 2), 
    // but typically for subscriptions we want to stick to the day or the last day of the month.
    // A simple approach is acceptable here, or we can check if the day changed.
    // Let's stick to simple Date addition which is standard behavior for now.
    
    const updatedSub = {
      ...sub,
      'Next Payment': nextDate.toISOString().split('T')[0]
    };

    await saveSubscription(updatedSub, userId);
    res.json(updatedSub);

  } catch (error) {
    console.error('Error marking as paid:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settings Endpoints
// Note: For now, settings are still global/file-based. 
// Ideally, these should be per-user too. 
app.post('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    const data = await fs.readFile(settingsPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json({});
  }
});

// AI Analysis Endpoint
app.post('/api/ai/analyze', authenticateToken, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

  try {
    const subs = await getAllSubscriptions(req.user.id);
    const activeSubs = subs.filter(s => s.Active === 'Yes');
    
    const groq = new Groq({ apiKey: apiKey });
    
    const prompt = `
      Analyze my following subscription data and provide:
      1. A summary of total monthly and yearly spending.
      2. 3 specific suggestions to save money (e.g., duplicate services, high-cost items).
      3. An assessment of whether the spending is balanced across categories.

      Data: ${JSON.stringify(activeSubs.map(s => ({ name: s.Name, price: s.Price, cycle: s['Payment Cycle'], category: s.Category })))} 

      Please provide the response in a structured Markdown format.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });

    res.json({ analysis: chatCompletion.choices[0]?.message?.content || "" });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'AI Analysis failed: ' + error.message });
  }
});

// SPA Fallback (Must be last)
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Scheduled Tasks ---

async function sendGotifyNotification(config, title, message) {
  if (!config.gotifyUrl || !config.gotifyToken) return;
  try {
    const url = new URL(`message?token=${config.gotifyToken}`, config.gotifyUrl).toString();
    await axios.post(url, {
      title: title,
      message: message,
      priority: 5
    });
    console.log('Gotify notification sent.');
  } catch (error) {
    console.error('Gotify Error:', error.message);
    throw new Error('Failed to send Gotify notification');
  }
}

async function sendEmailNotification(config, subject, text, to) {
  if (!config.smtpHost || !config.smtpUser) return;
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort) || 587,
      secure: config.smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    await transporter.sendMail({
      from: config.smtpFrom || config.smtpUser,
      to: to || config.smtpUser, // Default to self if 'to' not provided
      subject: subject,
      text: text,
    });
    console.log('Email sent.');
  } catch (error) {
    console.error('Email Error:', error.message);
    throw new Error('Failed to send email: ' + error.message);
  }
}

// Daily Reminder Logic (Shared)
async function runDailyReminderCheck() {
  console.log('[Reminder] Running daily reminder check at:', new Date().toLocaleString());
  try {
    const subs = await getAllSubscriptions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSoon = subs.filter(sub => {
      if (!sub['Next Payment'] || sub.Active !== 'Yes') return false;
      const dueDate = new Date(sub['Next Payment']);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log(`[Reminder] Checking ${sub.Name}: Due ${sub['Next Payment']}, Diff Days: ${diffDays}`);
      return diffDays >= 0 && diffDays <= 3; 
    });

    if (dueSoon.length > 0) {
      console.log(`[Reminder] Found ${dueSoon.length} subscriptions due soon.`);
      
      let config = {};
      try {
        const settingsPath = path.join(__dirname, '../data/settings.json');
        const data = await fs.readFile(settingsPath, 'utf-8');
        config = JSON.parse(data);
      } catch (e) { 
        console.log('[Reminder] No settings found for notifications.'); 
        return { success: false, message: 'No settings found' }; 
      }

      let message = `You have ${dueSoon.length} subscriptions due soon:\n` + 
                      dueSoon.map(s => `- ${s.Name} (${s.Price}) due on ${s['Next Payment']}`).join('\n');

      // AI Summary Integration
      if (config.groqApiKey) {
        try {
          console.log('[Reminder] Requesting Groq AI summary...');
          const groq = new Groq({ apiKey: config.groqApiKey });
          const aiPrompt = `
            I have the following subscriptions due soon. Please write a very concise, friendly, and professional reminder message for an email and push notification.
            List the items clearly with their prices and due dates.
            
            Subscriptions:
            ${dueSoon.map(s => `- ${s.Name}: ${s.Price}, due on ${s['Next Payment']}`).join('\n')}
          `;

          const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: aiPrompt }],
            model: 'llama-3.3-70b-versatile',
          });

          const aiSummary = chatCompletion.choices[0]?.message?.content;
          if (aiSummary) {
            message = aiSummary;
            console.log('[Reminder] AI summary generated successfully.');
          }
        } catch (aiErr) {
          console.error('[Reminder] Groq AI summary failed, using fallback message:', aiErr.message);
        }
      }

      if (config.notificationsEnabled !== false) {
        let sent = false;
        if (config.gotifyUrl && config.gotifyToken) {
          await sendGotifyNotification(config, 'Upcoming Payments', message);
          sent = true;
        }
        if (config.smtpHost && config.smtpUser) {
          await sendEmailNotification(config, 'Upcoming Payments Reminder', message);
          sent = true;
        }
        return { success: true, message: sent ? `Sent notifications for ${dueSoon.length} items.` : 'No notification channels configured.' };
      } else {
        console.log('[Reminder] Notifications are disabled in settings.');
        return { success: false, message: 'Notifications are disabled in settings.' };
      }
    } else {
      console.log('[Reminder] No subscriptions due in the next 3 days.');
      return { success: true, message: 'No subscriptions due in the next 3 days.' };
    }
  } catch (err) {
    console.error('[Reminder] Error:', err);
    throw err;
  }
}

// Test Endpoints
app.post('/api/test/reminders', async (req, res) => {
  try {
    const result = await runDailyReminderCheck();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test/gotify', async (req, res) => {
  try {
    const subs = await getAllSubscriptions();
    const activeSubs = subs.filter(s => s.Active === 'Yes');
    const message = `Test Notification\n\nYou have ${activeSubs.length} active subscriptions.\nTotal Monthly: ₹${activeSubs.reduce((sum, s) => sum + convertToINR(s.Price), 0).toFixed(2)}`;
    
    await sendGotifyNotification(req.body, 'Subscriptions App Test', message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test/email', async (req, res) => {
  try {
    const subs = await getAllSubscriptions();
    const activeSubs = subs.filter(s => s.Active === 'Yes');
    const message = `This is a test email from your Subscriptions App.\n\nYour active subscriptions:\n` + 
                    activeSubs.map(s => `- ${s.Name}: ${s.Price}`).join('\n');
    
    await sendEmailNotification(req.body, 'Subscriptions App Test', message, req.body.testRecipient);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily Reminder Cron Job (Runs at 9:00 AM)
cron.schedule('0 9 * * *', async () => {
  try {
    await runDailyReminderCheck();
  } catch (err) {
    console.error('[Cron] Reminder Job Failed:', err);
  }
});


// Update exchange rates daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily exchange rate update...');
  await updateRates();
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Initial rates update
  await updateRates();
});