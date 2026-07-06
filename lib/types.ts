export type Category =
  | "revenue"
  | "lead"
  | "booking"
  | "job_completed"
  | "expense"
  | "other";

export type Business = {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  currency: string;
  brand_colour: string;
  created_at: string;
};

export type MetricEntry = {
  id: string;
  business_id: string;
  date: string; // YYYY-MM-DD
  category: Category;
  value: number;
  label: string | null;
  notes: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  business_id: string;
  metric: "revenue" | "leads" | "jobs";
  target: number;
  period: "monthly";
};

export type KpiMetric = {
  thisMonth: number;
  lastMonth: number;
  change: number;
};

export type KpiData = {
  revenue: KpiMetric;
  leads: KpiMetric;
  jobs: KpiMetric;
  avgJobValue: KpiMetric;
};

export type MonthlyTrend = {
  month: string;
  revenue: number;
  leads: number;
  jobs: number;
};

export type ServiceBreakdown = {
  label: string;
  value: number;
};

export type MonthlySummary = {
  month: string;
  revenue: number;
  leads: number;
  jobs: number;
  avgJobValue: number;
  revenueChange: number | null;
};
