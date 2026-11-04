export interface Subscription {
  id: string;
  Name: string;
  Price: string;
  'Payment Cycle': string;
  'Next Payment': string;
  Category: string;
  Active: string;
  Renewal: string;
  'Payment Method'?: string;
  PaidBy?: string;
  Notes?: string;
  URL?: string;
  ManualLogo?: string;
  value?: number;
  currency?: string;
  valueINR?: number;
  monthlyCost?: number;
  yearlyCost?: number;
}

export interface Settings {
  geminiApiKey?: string;
  geminiModel?: string;
  gotifyUrl?: string;
  gotifyToken?: string;
  gotifyPriority?: number;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  testRecipient?: string;
  mainCurrency?: string;
  notificationsEnabled?: boolean;
  dailyCheckTime?: string;
  timezone?: string;
  alertDaysAhead?: number;
  notifyOnOverdue?: boolean;
  dailyDigest?: boolean;
  lastDailyCheck?: string | null;
  lastDailyCheckResult?: string | null;
}

export interface DashboardData {
  subscriptions: Subscription[];
  stats: {
    totalMonthlyINR: number;
    totalYearlyINR: number;
    averageMonthlyINR: number;
    dueThisMonthINR: number;
    overdueCount: number;
    activeCount: number;
    totalCount: number;
    mostExpensive: Subscription | null;
    categoryStats: Record<string, number>;
  };
}

export interface GeminiModel {
  id: string;
  name: string;
  description: string;
}
