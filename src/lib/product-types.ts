export type ProductCheckStatus = "up" | "down" | "error";

export interface Product {
  id: string;
  name: string;
  url: string;
  description: string;
  createdBy: string | null;
  createdAt: number;
  lastCheckedAt?: number | null;
  lastStatus?: ProductCheckStatus | null;
  lastStatusCode?: number | null;
  lastError?: string | null;
  domainPurchased?: boolean;
  domainPurchasedAt?: number | null;
  domainExpiryAt?: number | null;
  /** Date (YYYY-MM-DD) the last domain-expiry reminder was sent, so it fires once a day. */
  domainExpiryAlertedDate?: string | null;
}

export interface ProductCheck {
  id: string;
  status: ProductCheckStatus;
  statusCode: number | null;
  error: string | null;
  responseTimeMs: number | null;
  checkedAt: number;
  /** True only when this specific check triggered a down/error alert email. */
  emailSent?: boolean;
}
