export type PaymentMethod = 'cash' | 'qris' | 'transfer';

export type ExpenseCategory = 'supplies' | 'utilities' | 'rent' | 'other';

export type Service = {
  id: number;
  name: string;
  price: number;
  is_active: boolean;
};

export type Settings = {
  name: string;
  timezone: string;
  currency: string;
  default_service_id: number | null;
};

export type TransactionItem = {
  id: number;
  service_id: number;
  service_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Transaction = {
  id: number;
  reference: string;
  occurred_at: string;
  payment_method: PaymentMethod;
  total_amount: number;
  note: string | null;
  version: number;
  items: TransactionItem[];
};

export type Expense = {
  id: number;
  reference: string;
  occurred_at: string;
  description: string;
  category: ExpenseCategory | null;
  amount: number;
  payment_method: PaymentMethod;
  version: number;
};

export type HistoryRow = {
  type: 'transaction' | 'expense';
  id: number;
  reference: string;
  occurred_at: string;
  amount: number;
  payment_method: PaymentMethod;
  summary: string;
};

export type ReportSummary = {
  date_from: string;
  date_to: string;
  total_income: number;
  transaction_count: number;
  total_expense: number;
  expense_count: number;
  net_difference: number;
  income_by_payment_method: { payment_method: PaymentMethod; total: number; count: number }[];
  income_by_service: { service_id: number; service_name: string; quantity: number; total: number }[];
};

export type PageMeta = { current_page: number; last_page: number; per_page: number; total: number };
