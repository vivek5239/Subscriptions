import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data/subscriptions.json');
const SETTINGS_PATH = path.join(__dirname, '../data/settings.json');

// Ensure data files exist
async function ensureData() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, '[]', 'utf-8');
  }
}

// Calculate the next payment date given current date and cycle
export function calculateNextDate(currentDateStr, cycle) {
  if (!currentDateStr) return new Date().toISOString().split('T')[0];
  
  const current = new Date(currentDateStr);
  if (isNaN(current.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  const next = new Date(current);

  switch (cycle) {
    case 'Weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'Bi-Weekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'Monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'Quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'Every 6 Months':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'Yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'One-Time':
      // Do not advance one-time payments
      return currentDateStr;
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next.toISOString().split('T')[0];
}

// Roll forward recurring dates that are in the past to the next upcoming cycle date
export function advanceToCurrentCycle(currentDateStr, cycle) {
  if (!currentDateStr || cycle === 'One-Time') return currentDateStr;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let target = new Date(currentDateStr);
  target.setHours(0, 0, 0, 0);

  if (isNaN(target.getTime())) return new Date().toISOString().split('T')[0];

  // If already in the future or today, no advancement needed
  if (target.getTime() >= today.getTime()) {
    return currentDateStr;
  }

  // Advance step-by-step until target >= today (limit to 120 iterations to prevent infinite loops)
  let iterations = 0;
  while (target.getTime() < today.getTime() && iterations < 120) {
    iterations++;
    switch (cycle) {
      case 'Weekly':
        target.setDate(target.getDate() + 7);
        break;
      case 'Bi-Weekly':
        target.setDate(target.getDate() + 14);
        break;
      case 'Monthly':
        target.setMonth(target.getMonth() + 1);
        break;
      case 'Quarterly':
        target.setMonth(target.getMonth() + 3);
        break;
      case 'Every 6 Months':
        target.setMonth(target.getMonth() + 6);
        break;
      case 'Yearly':
        target.setFullYear(target.getFullYear() + 1);
        break;
      default:
        target.setMonth(target.getMonth() + 1);
        break;
    }
  }

  return target.toISOString().split('T')[0];
}

// Get all subscriptions
export async function getAllSubscriptions() {
  await ensureData();
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    let subscriptions = JSON.parse(data);

    let modified = false;
    subscriptions = subscriptions.map(sub => {
      if (!sub.id) {
        sub.id = crypto.randomUUID();
        modified = true;
      }
      return sub;
    });

    if (modified) {
      await fs.writeFile(DATA_PATH, JSON.stringify(subscriptions, null, 2), 'utf-8');
    }

    return subscriptions;
  } catch (error) {
    console.error('[DB] Error reading subscriptions:', error);
    return [];
  }
}

// Save or update subscription
export async function saveSubscription(subscription) {
  await ensureData();
  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let subs = JSON.parse(data);

  if (!subscription.id) {
    subscription.id = crypto.randomUUID();
    subs.push(subscription);
  } else {
    const index = subs.findIndex(s => s.id === subscription.id);
    if (index !== -1) {
      subs[index] = { ...subs[index], ...subscription };
    } else {
      subs.push(subscription);
    }
  }

  await fs.writeFile(DATA_PATH, JSON.stringify(subs, null, 2), 'utf-8');
  return subscription;
}

// Delete subscription
export async function deleteSubscription(id) {
  await ensureData();
  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let subs = JSON.parse(data);
  const newSubs = subs.filter(s => s.id !== id);
  await fs.writeFile(DATA_PATH, JSON.stringify(newSubs, null, 2), 'utf-8');
  return true;
}

// Mark subscription as paid and advance next payment date
export async function advanceSubscriptionPayment(id) {
  const subs = await getAllSubscriptions();
  const sub = subs.find(s => s.id === id);
  if (!sub) {
    throw new Error('Subscription not found');
  }

  const nextDateStr = calculateNextDate(sub['Next Payment'], sub['Payment Cycle']);
  const updatedSub = {
    ...sub,
    'Next Payment': nextDateStr
  };

  await saveSubscription(updatedSub);
  return updatedSub;
}

// Sync all overdue subscriptions to current cycle
export async function syncOverdueCycles() {
  const subs = await getAllSubscriptions();
  let updatedCount = 0;
  const updatedSubs = subs.map(sub => {
    if (sub.Active === 'Yes' && sub['Next Payment'] && sub['Payment Cycle'] !== 'One-Time') {
      const advanced = advanceToCurrentCycle(sub['Next Payment'], sub['Payment Cycle']);
      if (advanced !== sub['Next Payment']) {
        updatedCount++;
        return { ...sub, 'Next Payment': advanced };
      }
    }
    return sub;
  });

  if (updatedCount > 0) {
    await fs.writeFile(DATA_PATH, JSON.stringify(updatedSubs, null, 2), 'utf-8');
  }

  return { updatedCount, subscriptions: updatedSubs };
}

// Clone a subscription
export async function cloneSubscription(id) {
  const subs = await getAllSubscriptions();
  const sub = subs.find(s => s.id === id);
  if (!sub) throw new Error('Subscription not found');

  const cloned = {
    ...sub,
    id: crypto.randomUUID(),
    Name: `${sub.Name} (Copy)`,
    'Next Payment': calculateNextDate(sub['Next Payment'], sub['Payment Cycle'])
  };

  await saveSubscription(cloned);
  return cloned;
}

// Settings management
const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-pro',
  gotifyUrl: 'https://gotify.rvitservices.uk/',
  gotifyToken: '',
  gotifyPriority: 5,
  smtpHost: 'smtp.gmail.com',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
  testRecipient: '',
  mainCurrency: 'INR',
  notificationsEnabled: true,
  dailyCheckTime: '09:00',
  timezone: 'Asia/Kolkata',
  alertDaysAhead: 3,
  notifyOnOverdue: true,
  dailyDigest: false,
  lastDailyCheck: null,
  lastDailyCheckResult: null
};

export async function getSettings() {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(newSettings) {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
