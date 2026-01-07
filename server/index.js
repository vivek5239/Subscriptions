import express from 'express';
import cors from 'cors';
import { getAllSubscriptions, saveSubscription, deleteSubscription } from './db.js';
import { convertToINR, parsePrice } from './currency.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
