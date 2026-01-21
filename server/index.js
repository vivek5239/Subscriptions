import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import axios from 'axios';
import Groq from 'groq-sdk';
import { getAllReminders, saveReminder, deleteReminder } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints ---

// Get All Reminders
app.get('/api/reminders', async (req, res) => {
  try {
    const rems = await getAllReminders();
    res.json({ reminders: rems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Save Reminder
app.post('/api/reminders', async (req, res) => {
  try {
    const rem = await saveReminder(req.body);
    res.json(rem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Reminder
app.delete('/api/reminders/:id', async (req, res) => {
  try {
    await deleteReminder(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Endpoints
app.post('/api/settings', async (req, res) => {
  try {
    await ensureSettingsFile(); // Ensure file exists and is valid
    const data = await fs.readFile(settingsPath, 'utf-8');
    const oldSettings = JSON.parse(data);

    const newSettings = { ...oldSettings, ...req.body };
    await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
    
    // Reschedule the job if the time has changed
    scheduleDailyReminder();

    res.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    await ensureSettingsFile(); // Ensure file exists and is valid
    const data = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(data);
    res.json({
      ...settings,
      dailyCheckTime: settings.dailyCheckTime || '09:00',
      lastDailyCheck: settings.lastDailyCheck || null,
    });
  } catch (error) {
    // If still an error, it means file exists but is bad JSON despite ensure.
    // Or ensureSettingsFile itself failed. Return default in this case.
    console.error(`[Settings] Error getting settings even after ensure: ${error.message}`);
    res.json({ dailyCheckTime: '09:00', lastDailyCheck: null });
  }
});

// AI Analysis Endpoint - Now for general Reminder Insights
app.post('/api/ai/analyze', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

  try {
    const rems = await getAllReminders();
    const activeRems = rems.filter(s => s.Active === 'Yes');
    
    const groq = new Groq({ apiKey: apiKey });
    
    const prompt = `
      Analyze my following reminders and provide:
      1. A summary of active reminders.
      2. 3 suggestions for better reminder management or grouping.
      3. An assessment of how well reminders are spread across categories.

      Data: ${JSON.stringify(activeRems.map(s => ({ name: s.Name, nextPayment: s['Next Payment'], category: s.Category })))} 

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

// AI Create Reminder Endpoint
app.post('/api/ai/create-reminder', async (req, res) => {
  const { text, apiKey } = req.body;
  if (!text) return res.status(400).json({ error: 'Reminder text is required' });
  if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

  try {
    const groq = new Groq({ apiKey: apiKey });
    
    const prompt = `
      Parse the following natural language text into a structured JSON object for a reminder.

      The final JSON object must have this structure:
      {
        "Name": "string",
        "Next Payment": "YYYY-MM-DD",
        "Category": "string",
        "Active": "Yes",
        "Notes": "string (optional)",
        "tamilMonthIndex": "number (0-11, optional)",
        "tamilDay": "number (1-32, optional)"
      }

      - If a specific date is not provided, use today's date. If a year is not specified, assume the current year.
      - If a named event (e.g., "Diwali", "Christmas") is mentioned without a date, try to infer the next upcoming date for that event. If inference is not possible, ask a clarifying question.
      - "Active" should always be "Yes".
      - If a Tamil month (e.g., Chithirai, Thai) and day are detected, provide 'tamilMonthIndex' and 'tamilDay' instead of 'Next Payment'. 'tamilMonthIndex' should be 0 for Chithirai, 1 for Vaikasi, ..., 11 for Panguni.

      Natural language text: "${text}"

      **Your Task:**

      1.  **If you have all the necessary information** (at least a "Name" and either a "Next Payment" date or "tamilMonthIndex" and "tamilDay"), respond with ONLY the final JSON object.
      2.  **If information is missing or ambiguous** (e.g., "remind me to call John", but no date), you MUST ask a single, clear clarifying question. Your response in this case MUST be a JSON object with a "question" field, like this:
          { "question": "When would you like to be reminded to call John?" }
          
      Do not generate a reminder if you are missing information; ask a question instead.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: "json_object" },
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;
    if (!aiResponse) {
        throw new Error("AI did not return a valid response.");
    }
    
    const parsedResponse = JSON.parse(aiResponse);

    // Check if the AI is asking a question
    if (parsedResponse.question) {
      return res.json({ question: parsedResponse.question });
    }

    // If not a question, it should be a reminder object
    let parsedReminder = parsedResponse;

    // Handle Tamil Date Conversion if provided by AI
    if (typeof parsedReminder.tamilMonthIndex === 'number' && typeof parsedReminder.tamilDay === 'number') {
      try {
        const tamilDateRes = await axios.post('http://localhost:5000/api/convert-tamil-date', {
          tamilMonthIndex: parsedReminder.tamilMonthIndex,
          tamilDay: parsedReminder.tamilDay,
        });
        parsedReminder['Next Payment'] = tamilDateRes.data.gregorianDate;
        delete parsedReminder.tamilMonthIndex; // Clean up
        delete parsedReminder.tamilDay; // Clean up
      } catch (tamilErr) {
        console.error('Tamil date conversion failed:', tamilErr.message);
        return res.json({ question: "I understood a Tamil date, but I couldn't convert it. Can you provide the Gregorian date instead?" });
      }
    }

    // Basic validation and default values
    if (!parsedReminder.Name || !parsedReminder["Next Payment"]) {
      // If the AI fails to return the required fields or a question, ask a generic question.
      return res.json({ question: "I couldn't quite understand that. Could you provide more details, like a name and a date for the reminder?" });
    }

    // Ensure 'Next Payment' is a valid date
    const date = new Date(parsedReminder["Next Payment"]);
    if (isNaN(date.getTime())) {
        parsedReminder["Next Payment"] = new Date().toISOString().split('T')[0];
    } else {
        parsedReminder["Next Payment"] = date.toISOString().split('T')[0];
    }

    parsedReminder.Active = "Yes";

    const savedReminder = await saveReminder(parsedReminder);
    res.json(savedReminder);

  } catch (error) {
    console.error('AI Create Reminder Error:', error);
    res.status(500).json({ error: 'AI Reminder creation failed: ' + error.message });
  }
});

// Tamil Date Conversion Endpoint
app.post('/api/convert-tamil-date', (req, res) => {
  const { tamilMonthIndex, tamilDay } = req.body;

  if (typeof tamilMonthIndex === 'undefined' || typeof tamilDay === 'undefined') {
    return res.status(400).json({ error: 'tamilMonthIndex and tamilDay are required' });
  }

  // Simplified mapping for Tamil months to Gregorian. 
  // This is an approximation and does not account for leap years or precise astronomical calculations.
  // Tamil months typically start mid-Gregorian month.
  const TAMIL_MONTHS_GREGORIAN_START = [
    { name: 'Chithirai', gregorianMonth: 3, gregorianDay: 14, days: 31 }, // April 14
    { name: 'Vaikasi', gregorianMonth: 4, gregorianDay: 14, days: 31 }, // May 14
    { name: 'Aani', gregorianMonth: 5, gregorianDay: 15, days: 32 }, // June 15
    { name: 'Aadi', gregorianMonth: 6, gregorianDay: 16, days: 31 }, // July 16
    { name: 'Avani', gregorianMonth: 7, gregorianDay: 17, days: 31 }, // Aug 17
    { name: 'Purattasi', gregorianMonth: 8, gregorianDay: 17, days: 31 }, // Sep 17
    { name: 'Aippasi', gregorianMonth: 9, gregorianDay: 17, days: 30 }, // Oct 17
    { name: 'Karthigai', gregorianMonth: 10, gregorianDay: 16, days: 29 }, // Nov 16
    { name: 'Margazhi', gregorianMonth: 11, gregorianDay: 16, days: 29 }, // Dec 16
    { name: 'Thai', gregorianMonth: 0, gregorianDay: 14, days: 30 }, // Jan 14 (Next Gregorian Year)
    { name: 'Maasi', gregorianMonth: 1, gregorianDay: 13, days: 30 }, // Feb 13
    { name: 'Panguni', gregorianMonth: 2, gregorianDay: 14, days: 30 }  // Mar 14
  ];

  if (tamilMonthIndex < 0 || tamilMonthIndex >= TAMIL_MONTHS_GREGORIAN_START.length) {
    return res.status(400).json({ error: 'Invalid tamilMonthIndex' });
  }

  const currentYear = new Date().getFullYear();
  const tamilMonthData = TAMIL_MONTHS_GREGORIAN_START[tamilMonthIndex];

  let gregorianDate = new Date(currentYear, tamilMonthData.gregorianMonth, tamilMonthData.gregorianDay + tamilDay - 1);

  // Handle year rollover for 'Thai' and 'Maasi' if current date is before Tamil new year (Chithirai)
  if (tamilMonthData.gregorianMonth < 3 && new Date().getMonth() > 3) { // If Tamil month is Jan-Mar and current month is after April
      gregorianDate.setFullYear(currentYear + 1);
  }

  if (gregorianDate.getDate() !== (tamilMonthData.gregorianDay + tamilDay - 1)) {
    // This is a very basic check for overflow if tamilDay is too large for the month.
    // A more robust solution would be needed for precise calendar conversions.
    console.warn(`Tamil day ${tamilDay} might be out of range for ${tamilMonthData.name} in Gregorian conversion.`);
  }

  res.json({ gregorianDate: gregorianDate.toISOString().split('T')[0] });
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

async function sendEmailNotification(config, remject, text, to) {
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
      remject: remject,
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
    const rems = await getAllReminders();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSoon = rems.filter(rem => {
      if (!rem['Next Payment'] || rem.Active !== 'Yes') return false;
      const dueDate = new Date(rem['Next Payment']);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log(`[Reminder] Checking ${rem.Name}: Due ${rem['Next Payment']}, Diff Days: ${diffDays}, Remind Before: ${rem.remindBefore ?? 'default (3)'}`);
      return diffDays >= 0 && diffDays <= (rem.remindBefore ?? 3); 
    });

    if (dueSoon.length > 0) {
      console.log(`[Reminder] Found ${dueSoon.length} reminders due soon.`);
      
      let config = {};
      try {
        const settingsPath = path.join(__dirname, '../data/settings.json');
        const data = await fs.readFile(settingsPath, 'utf-8');
        config = JSON.parse(data);
      } catch (e) { 
        console.log('[Reminder] No settings found for notifications.'); 
        return { success: false, message: 'No settings found' }; 
      }

      let message = `You have ${dueSoon.length} reminders due soon:\n` + 
                      dueSoon.map(s => `- ${s.Name} due on ${s['Next Payment']}`).join('\n');

      // AI Summary Integration
      if (config.groqApiKey) {
        try {
          console.log('[Reminder] Requesting Groq AI summary...');
          const groq = new Groq({ apiKey: config.groqApiKey });
          const aiPrompt = `
            I have the following reminders due soon. Please write a very concise, friendly, and professional reminder message for an email and push notification.
            List the items clearly with their due dates.
            
            Reminders:
            ${dueSoon.map(s => `- ${s.Name} due on ${s['Next Payment']}`).join('\n')}
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
          await sendGotifyNotification(config, 'Upcoming Reminders', message);
          sent = true;
        }
        if (config.smtpHost && config.smtpUser) {
          await sendEmailNotification(config, 'Upcoming Reminders Notification', message);
          sent = true;
        }
        return { success: true, message: sent ? `Sent notifications for ${dueSoon.length} items.` : 'No notification channels configured.' };
      } else {
        console.log('[Reminder] Notifications are disabled in settings.');
        return { success: false, message: 'Notifications are disabled in settings.' };
      }
    } else {
      console.log('[Reminder] No reminders due in the next 3 days.');
      return { success: true, message: 'No reminders due in the next 3 days.' };
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
    const rems = await getAllReminders();
    const activeRems = rems.filter(s => s.Active === 'Yes');
    const message = `Test Notification\n\nYou have ${activeRems.length} active reminders.`;
    
    await sendGotifyNotification(req.body, 'Reminders App Test', message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test/email', async (req, res) => {
  try {
    const rems = await getAllReminders();
    const activeRems = rems.filter(s => s.Active === 'Yes');
    const message = `This is a test email from your Reminders App.\n\nYour active reminders:\n` + 
                    activeRems.map(s => `- ${s.Name}`).join('\n');
    
    await sendEmailNotification(req.body, 'Reminders App Test', message, req.body.testRecipient);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const DATA_PATH = path.join(__dirname, '../data/reminders.json');
const settingsPath = path.join(__dirname, '../data/settings.json');

// Function to ensure settings.json exists and is valid JSON
async function ensureSettingsFile() {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    JSON.parse(data); // Try to parse to check if it's valid JSON.
  } catch (e) {
    // If file doesn't exist (ENOENT) or is invalid JSON, create/overwrite with an empty object
    console.warn(`[Settings] settings.json not found or invalid, initializing with empty object. Error: ${e.message}`);
    await fs.writeFile(settingsPath, '{}');
  }
}

let dailyReminderJob;

function scheduleDailyReminder() {
  if (dailyReminderJob) {
    dailyReminderJob.stop();
  }

  fs.readFile(settingsPath, 'utf-8')
    .then(data => JSON.parse(data))
    .catch(() => ({})) // Ignore errors if file doesn't exist, use empty object
    .then(settings => {
      const time = settings.dailyCheckTime || '09:00';
      const [hour, minute] = time.split(':');
      const cronExpression = `${minute} ${hour} * * *`;

      dailyReminderJob = cron.schedule(cronExpression, async () => {
        try {
          await runDailyReminderCheck();
          // Update last run time
          const currentSettings = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
          currentSettings.lastDailyCheck = new Date().toISOString();
          await fs.writeFile(settingsPath, JSON.stringify(currentSettings, null, 2));
        } catch (err) {
          console.error('[Cron] Reminder Job Failed:', err);
        }
      });
      console.log(`[Cron] Daily reminder job scheduled for ${time}`);
    });
}

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await ensureSettingsFile(); // Ensure settings file exists
  // Schedule the daily reminder job
  scheduleDailyReminder();
});