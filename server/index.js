import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import axios from 'axios';
import Groq from 'groq-sdk';
import { getAllSubscriptions, saveSubscription, deleteSubscription } from './db.js';
import { convertToINR, parsePrice } from './currency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints ---

// Get All Subscriptions & Stats
app.get('/api/subscriptions', async (req, res) => {
  try {
    const subs = await getAllSubscriptions();
    
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
app.post('/api/subscriptions', async (req, res) => {
  try {
    const sub = await saveSubscription(req.body);
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Subscription
app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    await deleteSubscription(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Endpoints
app.post('/api/settings', async (req, res) => {
  try {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    const data = await fs.readFile(settingsPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json({});
  }
});

// AI Analysis Endpoint
app.post('/api/ai/analyze', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

  try {
    const subs = await getAllSubscriptions();
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

// Test Endpoints
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
  console.log('Running daily reminder check...');
  try {
    const subs = await getAllSubscriptions();
    const today = new Date();
    const dueSoon = subs.filter(sub => {
      if (!sub['Next Payment'] || sub.Active !== 'Yes') return false;
      const dueDate = new Date(sub['Next Payment']);
      const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 3; // Notify for payments due in next 3 days
    });

    if (dueSoon.length > 0) {
      console.log(`Found ${dueSoon.length} subscriptions due soon.`);
      
      // Load settings
      let config = {};
      try {
        const settingsPath = path.join(__dirname, '../data/settings.json');
        const data = await fs.readFile(settingsPath, 'utf-8');
        config = JSON.parse(data);
      } catch (e) { console.log('No settings found for notifications.'); return; }

      const message = `You have ${dueSoon.length} subscriptions due soon:\n` + 
                      dueSoon.map(s => `- ${s.Name} (${s.Price}) due on ${s['Next Payment']}`).join('\n');

      // Send Notifications
      if (config.gotifyUrl) await sendGotifyNotification(config, 'Upcoming Payments', message);
      if (config.smtpHost) await sendEmailNotification(config, 'Upcoming Payments Reminder', message);
    }
  } catch (err) {
    console.error('Cron Error:', err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});