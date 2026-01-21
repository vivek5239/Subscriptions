export interface Reminder {
  id: string;
  Name: string;
  'Next Payment': string; // YYYY-MM-DD
  Category: string;
  Active: 'Yes' | 'No';
  Notes?: string;
  remindBefore?: number;
}

export interface DashboardData {
  reminders: Reminder[];
}

export interface Settings {
  groqApiKey: string;
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