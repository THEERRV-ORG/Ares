export interface FinanceCategory {
  name: string;
  amount: number;
  createdBy: string | null;
  createdAt: number;
}

export interface FinanceIncomeEntry {
  source: string;
  amount: number;
  createdBy: string | null;
  createdAt: number;
}

export interface FinanceMonth {
  id: string;
  incomeEntries: Record<string, FinanceIncomeEntry>;
  categories: Record<string, FinanceCategory>;
  updatedBy: string | null;
  updatedAt: number;
}
