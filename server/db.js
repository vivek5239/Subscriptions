import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data/subscriptions.json');
const USERS_PATH = path.join(__dirname, '../data/users.json');

// Ensure data exists
async function ensureData() {
  try {
    await fs.access(DATA_PATH);
  } catch (e) {
    await fs.writeFile(DATA_PATH, '[]');
  }
  try {
    await fs.access(USERS_PATH);
  } catch (e) {
    await fs.writeFile(USERS_PATH, '[]');
  }
}

// --- Users ---

export async function getAllUsers() {
  await ensureData();
  const data = await fs.readFile(USERS_PATH, 'utf-8');
  return JSON.parse(data);
}

export async function saveUser(user) {
  const users = await getAllUsers();
  if (user.id) {
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }
  } else {
    user.id = crypto.randomUUID();
    users.push(user);
  }
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
  return user;
}

export async function findUserByEmail(email) {
  const users = await getAllUsers();
  return users.find(u => u.email === email);
}

export async function findUserById(id) {
  const users = await getAllUsers();
  return users.find(u => u.id === id);
}

// --- Subscriptions ---

export async function getAllSubscriptions(userId = null) {
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

  if (userId) {
    return subscriptions.filter(sub => sub.userId === userId);
  }

  return subscriptions;
}

export async function saveSubscription(subscription, userId = null) {
  // We need to read ALL subscriptions first to write them back correctly
  // but we only return the ones for the user if requested? 
  // actually saveSubscription updates one item.
  
  await ensureData(); // Ensure file exists
  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let subs = JSON.parse(data);

  if (userId) {
    subscription.userId = userId;
  }

  if (subscription.id) {
    const index = subs.findIndex(s => s.id === subscription.id);
    if (index !== -1) {
      // Security check: ensure the subscription belongs to the user if userId is provided
      if (userId && subs[index].userId && subs[index].userId !== userId) {
        throw new Error("Unauthorized access to subscription");
      }
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

export async function deleteSubscription(id, userId = null) {
  await ensureData();
  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let subs = JSON.parse(data);

  if (userId) {
    const sub = subs.find(s => s.id === id);
    if (sub && sub.userId && sub.userId !== userId) {
      throw new Error("Unauthorized access to subscription");
    }
  }

  const newSubs = subs.filter(s => s.id !== id);
  await fs.writeFile(DATA_PATH, JSON.stringify(newSubs, null, 2));
}
