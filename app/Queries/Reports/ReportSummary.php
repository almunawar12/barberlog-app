<?php

namespace App\Queries\Reports;

use App\Enums\PaymentMethod;
use App\Support\JakartaPeriod;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * One source of truth for dashboard, report screen and API totals. Active records only,
 * filtered on occurred_at over Jakarta calendar days. Transaction totals come from the
 * transactions table alone, so multi-item transactions are never counted more than once;
 * items are aggregated separately for the service breakdown.
 *
 * @phpstan-type Summary array{
 *     date_from: string,
 *     date_to: string,
 *     total_income: int,
 *     transaction_count: int,
 *     total_expense: int,
 *     expense_count: int,
 *     net_difference: int,
 *     income_by_payment_method: list<array{payment_method: string, total: int, count: int}>,
 *     income_by_service: list<array{service_id: int, service_name: string, quantity: int, total: int}>
 * }
 */
class ReportSummary
{
    /**
     * @param  string  $dateFrom  Y-m-d, Jakarta calendar date (inclusive)
     * @param  string  $dateTo  Y-m-d, Jakarta calendar date (inclusive)
     * @return Summary
     */
    public function handle(string $dateFrom, string $dateTo): array
    {
        [$start, $endExclusive] = JakartaPeriod::bounds($dateFrom, $dateTo);

        $transactions = fn (): Builder => DB::table('transactions')
            ->whereNull('deleted_at')
            ->where('occurred_at', '>=', $start)
            ->where('occurred_at', '<', $endExclusive);

        $income = $transactions()
            ->selectRaw('coalesce(sum(total_amount), 0) as total, count(*) as count')
            ->first();

        $expense = DB::table('expenses')
            ->whereNull('deleted_at')
            ->where('occurred_at', '>=', $start)
            ->where('occurred_at', '<', $endExclusive)
            ->selectRaw('coalesce(sum(amount), 0) as total, count(*) as count')
            ->first();

        $byMethod = $transactions()
            ->selectRaw('payment_method, sum(total_amount) as total, count(*) as count')
            ->groupBy('payment_method')
            ->get()
            ->keyBy('payment_method');

        $byService = DB::table('transaction_items as items')
            ->join('transactions', 'transactions.id', '=', 'items.transaction_id')
            ->whereNull('transactions.deleted_at')
            ->where('transactions.occurred_at', '>=', $start)
            ->where('transactions.occurred_at', '<', $endExclusive)
            ->selectRaw('items.service_id, (array_agg(items.service_name_snapshot order by transactions.occurred_at desc, items.id desc))[1] as service_name, sum(items.quantity) as quantity, sum(items.line_total) as total')
            ->groupBy('items.service_id')
            ->orderByDesc('quantity')
            ->orderByDesc('total')
            ->orderBy('items.service_id')
            ->get();

        $totalIncome = (int) ($income->total ?? 0);
        $totalExpense = (int) ($expense->total ?? 0);

        return [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'total_income' => $totalIncome,
            'transaction_count' => (int) ($income->count ?? 0),
            'total_expense' => $totalExpense,
            'expense_count' => (int) ($expense->count ?? 0),
            'net_difference' => $totalIncome - $totalExpense,
            // Every method is always listed so clients get a stable shape.
            'income_by_payment_method' => array_map(fn (PaymentMethod $method) => [
                'payment_method' => $method->value,
                'total' => (int) ($byMethod->get($method->value)->total ?? 0),
                'count' => (int) ($byMethod->get($method->value)->count ?? 0),
            ], PaymentMethod::cases()),
            'income_by_service' => array_values($byService->map(fn (stdClass $row) => [
                'service_id' => (int) $row->service_id,
                'service_name' => (string) $row->service_name,
                'quantity' => (int) $row->quantity,
                'total' => (int) $row->total,
            ])->all()),
        ];
    }
}
