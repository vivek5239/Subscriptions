import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data/reminders.json');

// Ensure data exists and populate with samples if empty
async function ensureData() {
  try {
    await fs.access(DATA_PATH);
  } catch (e) {
    // If file doesn't exist, create it with an empty array
    await fs.writeFile(DATA_PATH, '[]');
  }

  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let reminders = JSON.parse(data);

  if (reminders.length === 0) {
    console.log('Populating with sample reminder data...');
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);
    const fifteenDaysFromNow = new Date(today);
    fifteenDaysFromNow.setDate(today.getDate() + 15);

    reminders = [
      {
        id: crypto.randomUUID(),
        Name: 'Sample: Call Mom',
        'Next Payment': fiveDaysFromNow.toISOString().split('T')[0],
        Category: 'Personal',
        Active: 'Yes',
        Notes: 'Wish her happy birthday!',
      },
      {
        id: crypto.randomUUID(),
        Name: 'Sample: Project Deadline',
        'Next Payment': fifteenDaysFromNow.toISOString().split('T')[0],
        Category: 'Work',
        Active: 'Yes',
        Notes: 'Submit the final report for Project X.',
      },
      {
        id: crypto.randomUUID(),
        Name: 'Sample: Buy Groceries',
        'Next Payment': today.toISOString().split('T')[0],
        Category: 'Shopping',
        Active: 'Yes',
        Notes: 'Milk, Eggs, Bread, Vegetables.',
      },
      {
        id: crypto.randomUUID(),
        Name: 'Sample: Doctor Appointment',
        'Next Payment': twoDaysAgo.toISOString().split('T')[0], // Past reminder
        Category: 'Health',
        Active: 'No', // Assuming past reminders might be inactive
        Notes: 'Annual check-up at Dr. Smith\'s office.',
      },
      {
        id: crypto.randomUUID(),
        Name: 'Sample: Tamil New Year',
        'Next Payment': '2026-04-14', // April 14, 2026 for demonstration
        Category: 'Culture',
        Active: 'Yes',
        Notes: 'Celebrate Puthandu!',
      }
    ];
    await fs.writeFile(DATA_PATH, JSON.stringify(reminders, null, 2));
  }
}

// --- Reminders ---

export async function getAllReminders() {
  await ensureData();
  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let reminders = JSON.parse(data);
  
  // Add IDs if missing
  let modified = false;
  reminders = reminders.map(rem => {
    if (!rem.id) {
      rem.id = crypto.randomUUID();
      modified = true;
    }
    return rem;
  });

  if (modified) {
    await fs.writeFile(DATA_PATH, JSON.stringify(reminders, null, 2));
  }

  return reminders;
}

export async function saveReminder(reminder) {
  await ensureData(); // Ensure file exists
  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let rems = JSON.parse(data);

  if (reminder.id) {
    const index = rems.findIndex(s => s.id === reminder.id);
    if (index !== -1) {
      rems[index] = { ...rems[index], ...reminder };
    } else {
      rems.push(reminder);
    }
  } else {
    reminder.id = crypto.randomUUID();
    rems.push(reminder);
  }
  await fs.writeFile(DATA_PATH, JSON.stringify(rems, null, 2));
  return reminder;
}

export async function deleteReminder(id) {
  await ensureData();
  const data = await fs.readFile(DATA_PATH, 'utf-8');
  let rems = JSON.parse(data);

  const newSubs = rems.filter(s => s.id !== id);
  await fs.writeFile(DATA_PATH, JSON.stringify(newSubs, null, 2));
}
