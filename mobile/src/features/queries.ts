import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { request } from '@/lib/api-client';
import type { Expense, HistoryRow, PageMeta, ReportSummary, Service, Settings, Transaction } from '@/types';

export type HistoryFilters = { date_from: string; date_to: string; type: '' | 'transaction' | 'expense' };

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () =>
      (await request<{ data: { summary: ReportSummary; recent: HistoryRow[] } }>('/dashboard')).data,
  });
}

export function useHistory(filters: HistoryFilters) {
  return useInfiniteQuery({
    queryKey: ['history', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      request<{ data: HistoryRow[]; meta: PageMeta }>('/history', {
        query: { ...filters, page: pageParam, per_page: 20 },
      }),
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  });
}

export function useReport(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['report', dateFrom, dateTo],
    queryFn: async () =>
      (await request<{ data: ReportSummary }>('/reports/summary', { query: { date_from: dateFrom, date_to: dateTo } })).data,
  });
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => (await request<{ data: Service[] }>('/services')).data,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await request<{ data: Settings }>('/settings')).data,
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await request<{ data: { id: number; name: string; email: string } }>('/auth/me')).data,
  });
}

export function useTransaction(transactionId: string) {
  return useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => (await request<{ data: Transaction }>(`/transactions/${transactionId}`)).data,
  });
}

export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: ['expense', expenseId],
    queryFn: async () => (await request<{ data: Expense }>(`/expenses/${expenseId}`)).data,
  });
}
