import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data/subscriptions.json');

// Ensure data exists
async function ensureData() {
  try {
    await fs.access(DATA_PATH);
  } catch (e) {
    await fs.writeFile(DATA_PATH, '[]');
  }
}

export async function getAllSubscriptions() {
  await ensureData();
  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let subscriptions = JSON.parse(data);
  
  // Add IDs if missing
  let modified = false;
  subscriptions = subscriptions.map(sub => {
    if (!sub.id) {
      sub.id = crypto.randomUUID();
      modified = true;
    }
    return sub;
  });

  if (modified) {
    await fs.writeFile(DATA_PATH, JSON.stringify(subscriptions, null, 2));
  }

  return subscriptions;
}

export async function saveSubscription(subscription) {
  const subs = await getAllSubscriptions();
  if (subscription.id) {
    const index = subs.findIndex(s => s.id === subscription.id);
    if (index !== -1) {
      subs[index] = { ...subs[index], ...subscription };
    } else {
      subs.push(subscription);
    }
  } else {
    subscription.id = crypto.randomUUID();
    subs.push(subscription);
  }
  await fs.writeFile(DATA_PATH, JSON.stringify(subs, null, 2));
  return subscription;
}

export async function deleteSubscription(id) {
  const subs = await getAllSubscriptions();
  const newSubs = subs.filter(s => s.id !== id);
  await fs.writeFile(DATA_PATH, JSON.stringify(newSubs, null, 2));
}
