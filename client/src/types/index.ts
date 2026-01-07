export interface Subscription {
  id: string;
  Name: string;
  Price: string;
  'Payment Cycle': string;
  'Next Payment': string;
  Category: string;
  Active: string;
  valueINR: number;
  monthlyCost: number;
  URL?: string;
  Notes?: string;
  'Payment Method'?: string;
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
