export interface FinanceCategory {
  name: string;
  amount: number;
  createdBy: string | null;
  createdAt: number;
}

export interface FinanceMonth {
  id: string;
  income: number;
  categories: Record<string, FinanceCategory>;
  updatedBy: string | null;
  updatedAt: number;
}
