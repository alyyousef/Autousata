export type ActivitySeverity = "INFO" | "WARN" | "ERROR" | "ALERT";

export type ActivityLogItem = {
  id: string;
  createdAt: string;

  severity: ActivitySeverity;
  action: string;

  userId?: string | null;
  userRole?: "admin" | "client" | "inspector" | "system" | string;
  userEmail?: string | null;

  entityType?: string | null;
  entityId?: string | null;

  description?: string | null;

  ipAddress?: string | null;
  userAgent?: string | null;

  suspicious?: boolean;

  metadata?: any;
};

export type ActivityQuery = {
  page: number;
  limit: number;

  search?: string;
  severity?: string;
  role?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  suspiciousOnly?: boolean;
  from?: string;
  to?: string;
};

export type PagedActivityLogs = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: ActivityLogItem[];
};

export type ActivityAnalyticsResponse = {
  kpis: { total: number; alerts: number; suspicious: number };
  bySeverity: Array<{ severity: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ userId: string; email?: string | null; count: number }>;
  topIps: Array<{ ipAddress: string; count: number }>;
  trend: Array<{ date: string; count: number }>;
};
