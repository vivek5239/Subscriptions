import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import axios from 'axios';
import Groq from 'groq-sdk';
import { getAllReminders, saveReminder, deleteReminder, getHolidayDate } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data/reminders.json');
const settingsPath = path.join(__dirname, '../data/settings.json');
let currentSettings = {}; // In-memory cache for settings

let dailyReminderJobInstance;
const activeReminderJobs = new Map();

const TAMIL_MONTH_DATA = [
  { name: 'Chithirai', gregorianMonth: 3, gregorianDay: 14, days: 31 },
  { name: 'Vaikasi', gregorianMonth: 4, gregorianDay: 14, days: 31 },
  { name: 'Aani', gregorianMonth: 5, gregorianDay: 15, days: 32 },
  { name: 'Aadi', gregorianMonth: 6, gregorianDay: 16, days: 31 },
  { name: 'Avani', gregorianMonth: 7, gregorianDay: 17, days: 31 },
  { name: 'Purattasi', gregorianMonth: 8, gregorianDay: 17, days: 31 },
  { name: 'Aippasi', gregorianMonth: 9, gregorianDay: 17, days: 30 },
  { name: 'Karthigai', gregorianMonth: 10, gregorianDay: 16, days: 29 },
  { name: 'Margazhi', gregorianMonth: 11, gregorianDay: 16, days: 29 },
  { name: 'Thai', gregorianMonth: 0, gregorianDay: 14, days: 30 },
  { name: 'Maasi', gregorianMonth: 1, gregorianDay: 13, days: 30 },
  { name: 'Panguni', gregorianMonth: 2, gregorianDay: 14, days: 30 }
];

const reminderSystemPrompt = `
You are an intelligent assistant that processes natural language text to create structured reminder data.
Your task is to analyze the user's input and extract the necessary details to create a reminder.
You MUST respond ONLY with a single, valid JSON object. Do not add any conversational text or explanations.

The JSON object should have the following structure:
{
  "Name": "string", // The main subject of the reminder (e.g., "Pay electricity bill").
  "Next Payment": "YYYY-MM-DD", // The upcoming date for the reminder.
  "Time": "HH:MM", // The time of the reminder in 24-hour format. Default to "09:00" if not specified.
  "Repeat": "One-Time" | "Daily" | "Weekly" | "Monthly" | "Yearly", // The recurrence pattern.
  "remindBefore": "number", // The number of days to remind before the due date. Default to 1 if not specified.
"HolidayType": "string" // Optional: If the reminder is for a specific holiday (e.g., "Diwali", "Christmas", "Pongal"), provide the name of the holiday.
}

RULES:
1.  **Date Calculation**: Today's date is ${new Date().toISOString().split('T')[0]}. Calculate all dates based on this.
2.  **Holiday/Event Dates**: For holidays or events like "Diwali", "Christmas", "New Year's", or "Pongal", determine the correct date for the next occurrence. For "Diwali" or "Pongal", you must find its specific date for the current or upcoming year.
3.  **Recurrence**:
    - "every month" or "monthly" should be "Monthly".
    - "every year" or "annually" should be "Yearly".
    - "every week" or "weekly" should be "Weekly".
    - If no recurrence is mentioned, it is "One-Time".
4.  **remindBefore**: If the user says "remind me X days before", extract X. If not specified, default to 1.
5.  **Time**: If a time is specified (e.g., "at 4pm"), use it. Otherwise, default to "09:00".

EXAMPLES:
- User: "send a gift to sister for every diwali remind 3 days before"
- You: (After determining the next Diwali date is, for example, 2026-10-31)
  {
    "Name": "Send a gift to sister for diwali",
    "Next Payment": "2026-10-31",
    "Time": "09:00",
    "Repeat": "Yearly",
    "remindBefore": 3,
    "HolidayType": "Diwali"
  }
- User: "Pay credit card bill on the 15th of every month"
- You:
  {
    "Name": "Pay credit card bill",
    "Next Payment": (Calculate the next 15th of the month),
    "Time": "09:00",
    "Repeat": "Monthly",
    "remindBefore": 1
  }

Do not include any other text, just the JSON object.
`;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
} else {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
}

// --- API Endpoints ---

async function ensureSettingsFile() {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    JSON.parse(data); // Try to parse to check if it's valid JSON.
  } catch (e) {
    // If file doesn't exist (ENOENT) or is invalid JSON, create/overwrite with an empty object
    await fs.writeFile(settingsPath, '{}');
  }
}

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
            req.body.Source = req.body.Source || 'Manual';
            const rem = await saveReminder(req.body, currentSettings);    res.json(rem);
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



// Convert Tamil Date to Gregorian

app.post('/api/convert-tamil-date', (req, res) => {

  try {

    const { tamilMonthIndex, tamilDay } = req.body;



    if (tamilMonthIndex === undefined || !Number.isInteger(tamilMonthIndex) || tamilDay === undefined) {

      return res.status(400).json({ error: 'Invalid or missing tamilMonthIndex or tamilDay' });

    }



    const monthData = TAMIL_MONTH_DATA[tamilMonthIndex];

    if (!monthData) {

      return res.status(400).json({ error: 'Invalid tamilMonthIndex' });

    }



    const today = new Date();

    today.setHours(0, 0, 0, 0); // Normalize to start of day

    let year = today.getFullYear();



    const startDate = new Date(year, monthData.gregorianMonth, monthData.gregorianDay);

    

    const targetDate = new Date(startDate);

    targetDate.setDate(startDate.getDate() + (parseInt(tamilDay, 10) - 1));



    // If the calculated date is in the past, assume the user means the next year's occurrence.

    if (targetDate < today) {

      targetDate.setFullYear(year + 1);

    }



    res.json({ gregorianDate: targetDate.toISOString().split('T')[0] });



  } catch (error) {

    console.error('Error in /api/convert-tamil-date:', error);

    res.status(500).json({ error: 'Internal server error during date conversion.' });
  }
});

// Get Holiday Date
app.get('/api/holiday-date', async (req, res) => {
  const { holidayName, year } = req.query;
  if (!holidayName || !year) {
    return res.status(400).json({ error: 'holidayName and year are required.' });
  }
  try {
    const date = await getHolidayDate(holidayName, parseInt(year), currentSettings.calendarificApiKey);
    if (date) {
      res.json({ date: date.date.iso });
    } else {
      res.status(404).json({ error: `Holiday '${holidayName}' not found for ${year}.` });
    }
  } catch (error) {
    console.error('Error fetching holiday date:', error);
    res.status(500).json({ error: 'Failed to fetch holiday date.' });
  }
});

    

    app.post('/api/ai/create-reminder', async (req, res) => {

    

            if (!currentSettings.groqApiKey) {

    

              return res.status(500).json({ error: 'Groq API Key is not configured in settings.' });

    

            }

    

            const { text, model } = req.body;

    

            if (!text) {

    

              return res.status(400).json({ error: 'Text is required.' });

    

            }

    

      

    

                        try {

    

      

    

                          const groq = new Groq({ apiKey: currentSettings.groqApiKey }); // Instantiate Groq here

    

      

    

                          const modelToUse = model || 'llama-3.3-70b-versatile'; // Determine the model to use

    

      

    

                          console.log(`[AI Reminder] Using Groq model: ${modelToUse}`); // Log the model

    

      

    

            

    

      

    

                          const chatCompletion = await groq.chat.completions.create({

    

      

    

                            messages: [

    

      

    

                              { role: 'system', content: reminderSystemPrompt },

    

      

    

                              { role: 'user', content: text }

    

      

    

                            ],

    

      

    

                            model: modelToUse, // Use the determined model

    

      

    

                            temperature: 0.1,

    

      

    

                            response_format: { type: 'json_object' },

    

      

    

                          });

    

                                        const jsonResponse = chatCompletion.choices[0]?.message?.content;

    

                                        const reminderData = JSON.parse(jsonResponse);

    

                                

    

                                        console.log('[AI Reminder] Raw AI response data:', reminderData); // Log raw AI response

    

                                

    

                                        // TODO: Add validation for the parsed reminderData object.

    

                                        

    

                                        reminderData.Source = 'AI';
        const savedReminder = await saveReminder(reminderData, currentSettings); // Save the reminder

    

                                        console.log('[AI Reminder] Saved reminder:', savedReminder); // Log saved reminder

    

                                res.json(savedReminder); // Return the saved reminder, not just the raw data

    

      } catch (error) {

    

          console.error('Groq API Error:', error);

    

          const errorMessage = error.error?.error?.message || 'Failed to generate reminder from AI due to an unknown error.';

    

              res.status(500).json({ error: 'Failed to generate reminder from AI due to an unknown error.' });

    

            }

    

          });

    

          

    

          // List available Groq models

    

          app.get('/api/groq/models', async (req, res) => {

    

            if (!currentSettings.groqApiKey) {

    

              return res.status(500).json({ error: 'Groq API Key is not configured in settings.' });

    

            }

    

            try {

    

              const groq = new Groq({ apiKey: currentSettings.groqApiKey });

    

              const models = await groq.models.list();

    

              const modelIds = models.data.map(model => model.id);

    

              res.json({ models: modelIds });

    

            } catch (error) {

    

              console.error('Error fetching Groq models:', error);

    

              res.status(500).json({ error: 'Failed to fetch Groq models.' });

    

            }

    

          });

    

          

    

          // Settings Endpoints

    

          app.post('/api/settings', async (req, res) => {

    

            try {
    console.log('[Settings] Received req.body:', req.body);
    await ensureSettingsFile(); // Ensure file exists and is valid
    const data = await fs.readFile(settingsPath, 'utf-8');
    const oldSettings = JSON.parse(data);
    console.log('[Settings] Old settings before merge:', oldSettings);

    const newSettings = { ...oldSettings, ...req.body };
    console.log('[Settings] New settings after merge:', newSettings);

    await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
    currentSettings = newSettings; // Update in-memory settings
    console.log('[Settings] Settings written successfully to:', settingsPath);
    
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
    console.log('[Settings] Reading settings from:', settingsPath);
    await ensureSettingsFile(); // Ensure file exists and is valid
    const data = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(data);
    console.log('[Settings] Parsed settings from file:', settings);
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

function scheduleDailyReminder() {
  if (dailyReminderJobInstance) {
    dailyReminderJobInstance.stop();
    console.log('[Scheduler] Stopped existing daily reminder job.');
  }

  const { dailyCheckTime, notificationsEnabled } = currentSettings;
  if (!notificationsEnabled) {
    console.log('[Scheduler] Daily reminders are disabled in settings. Not scheduling job.');
    return;
  }

  if (!dailyCheckTime) {
    console.warn('[Scheduler] dailyCheckTime not set in settings. Defaulting to 09:00.');
    // Fallback for dailyCheckTime if not set
    // For now, let's just not schedule if it's missing.
    return;
  }

  const [hour, minute] = dailyCheckTime.split(':').map(Number);
  const cronTime = `0 ${minute} ${hour} * * *`; // e.g., '0 09 * * *' for 9:00 AM daily

  dailyReminderJobInstance = cron.schedule(cronTime, async () => {
    console.log('[Scheduler] Running daily reminder check...');
    try {
      const allReminders = await getAllReminders();
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      for (const rem of allReminders) {
        // Auto-update Next Payment for Yearly Holiday Reminders
        if (rem.Repeat === 'Yearly' && rem.HolidayType && rem['Next Payment']) {
          const reminderDate = new Date(rem['Next Payment']);
          reminderDate.setHours(0, 0, 0, 0);

          if (reminderDate < today) {
            // Holiday date has passed, fetch next occurrence
            const currentYear = today.getFullYear();
            // Try current year first, if it's passed, then try next year.
            let nextHolidayDate = await getHolidayDate(
              rem.HolidayType, 
              currentYear, 
              currentSettings.calendarificApiKey
            );

            if (!nextHolidayDate || new Date(nextHolidayDate) < today) {
                nextHolidayDate = await getHolidayDate(
                  rem.HolidayType, 
                  currentYear + 1, 
                  currentSettings.calendarificApiKey
                );
            }

            if (nextHolidayDate && nextHolidayDate !== rem['Next Payment']) {
              console.log(`[Scheduler] Updating ${rem.Name} (${rem.HolidayType}) from ${rem['Next Payment']} to ${nextHolidayDate}`);
              rem['Next Payment'] = nextHolidayDate;
              await saveReminder(rem, currentSettings); // Save the updated reminder
            } else if (!nextHolidayDate) {
                console.warn(`[Scheduler] Could not find next date for yearly holiday reminder: ${rem.Name} (${rem.HolidayType}).`);
            }
          }
        }

        // TODO: Add actual notification logic here later
        // If notifications are enabled and reminder is active and due
        // ...
      }

      currentSettings.lastDailyCheck = new Date().toISOString();
      // Save settings back to file
      await fs.writeFile(settingsPath, JSON.stringify(currentSettings, null, 2));
      console.log('[Scheduler] Daily reminder check completed. Last check time updated.');

    } catch (error) {
      console.error('[Scheduler] Error during daily reminder check:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Assuming user's locale, adjust as needed
  });
  console.log(`[Scheduler] Daily reminder job scheduled for ${dailyCheckTime} (Asia/Kolkata).`);
}

// App listen call
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  await ensureSettingsFile(); // Ensure settings file exists
  const data = await fs.readFile(settingsPath, 'utf-8');
  currentSettings = JSON.parse(data);
  console.log('[Settings] Loaded initial settings:', currentSettings);
  scheduleDailyReminder();
});
