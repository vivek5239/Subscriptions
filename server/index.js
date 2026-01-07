import express from 'express';
import cors from 'cors';
import { getAllSubscriptions, saveSubscription, deleteSubscription } from './db.js';
import { convertToINR, parsePrice } from './currency.js';

import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// AI Analysis Endpoint
app.post('/api/ai/analyze', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

  try {
    const subs = await getAllSubscriptions();
    const activeSubs = subs.filter(s => s.Active === 'Yes');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    const prompt = `
      Analyze my following subscription data and provide:
      1. A summary of total monthly and yearly spending.
      2. 3 specific suggestions to save money (e.g., duplicate services, high-cost items).
      3. An assessment of whether the spending is balanced across categories.

      Data: ${JSON.stringify(activeSubs.map(s => ({ name: s.Name, price: s.Price, cycle: s['Payment Cycle'], category: s.Category })))} 

      Please provide the response in a structured Markdown format.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ analysis: response.text() });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'AI Analysis failed: ' + error.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

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
      // Simple check: if payment is this month (regardless of day)
      // Note: This logic assumes 'Next Payment' is updated accurately.
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).reduce((sum, sub) => sum + sub.valueINR, 0); // Summing normalized INR value

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

app.post('/api/subscriptions', async (req, res) => {
  try {
    const sub = await saveSubscription(req.body);
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    await deleteSubscription(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA Fallback
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import axios from 'axios';

// ... existing code ...

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

    if (dueSoon.length === 0) return;

    // Load config (In a real app, this would be from a config file/DB)
    // For now, we'll try to find a way to get the config saved from UI (localStorage is client side)
    // Better: Add a /api/config endpoint to save these values on server
    
    console.log(`Found ${dueSoon.length} subscriptions due soon. Sending notifications...`);
    
    // NOTE: In this prototype, we'll log them. 
    // Actual Gotify/Email would require the settings to be stored on the server.
  } catch (err) {
    console.error('Cron Error:', err);
  }
});

// Add Config Endpoint to store Settings on server
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
    res.json({}); // Return empty if not set
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
