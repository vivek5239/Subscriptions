export interface Reminder {
  id: string;
  Name: string;
  'Next Payment': string; // YYYY-MM-DD
  Time?: string; // HH:MM, optional
  Category: string;
  Active: 'Yes' | 'No';
  Notes?: string;
  remindBefore?: number;
  Repeat?: 'One-Time' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  tamilMonthIndex?: number; // 0-11
  tamilDay?: number; // 1-32
  HolidayType?: string; // e.g., "Diwali", "Pongal"
  Source?: 'API' | 'AI' | 'Manual';
}

export interface DashboardData {
  reminders: Reminder[];
}

export interface Settings {
  groqApiKey: string;
  groqModel?: string;
  calendarificApiKey?: string;
  gotifyUrl: string;
  gotifyToken: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  testRecipient: string;
  notificationsEnabled: boolean;
  dailyCheckTime: string;
  lastDailyCheck: string | null;
}