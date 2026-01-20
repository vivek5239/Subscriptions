export interface Subscription {
  id: string;
  Name: string;
  Price: string;
  'Payment Cycle': string;
  'Next Payment': string;
  Category: string;
  Active: string;
  Renewal: string;
  valueINR: number;
  monthlyCost: number;
  URL?: string;
  ManualLogo?: string;
  Notes?: string;
  'Payment Method'?: string;
}

export interface Settings {
  groqApiKey?: string;
  gotifyUrl?: string;
  gotifyToken?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  testRecipient?: string;
  mainCurrency: string;
  notificationsEnabled?: boolean;
  dailyCheckTime?: string;
  lastDailyCheck?: string | null;
}

export interface DashboardData {
  subscriptions: Subscription[];
  stats: {
    totalMonthlyINR: number;
    totalYearlyINR: number;
    averageMonthlyINR: number;
    dueThisMonthINR: number;
    mostExpensive: Subscription | null;
    categoryStats: Record<string, number>;
  };
}