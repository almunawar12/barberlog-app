export type PaymentMethod = 'cash' | 'qris' | 'transfer';

export type ExpenseCategory = 'supplies' | 'utilities' | 'rent' | 'other';

export type ServiceOption = {
    id: number;
    name: string;
    price: number;
};

export type TransactionItemRecord = {
    id: number;
    service_id: number;
    service_name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
};

export type TransactionRecord = {
    id: number;
    reference: string;
    occurred_at: string;
    payment_method: PaymentMethod;
    total_amount: number;
    note: string | null;
    version: number;
    items: TransactionItemRecord[];
};

export type ExpenseRecord = {
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
