<?php

namespace App\Queries\History;

use App\Models\Expense;
use App\Models\TransactionItem;
use App\Support\JakartaPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * Combined, newest-first list of active transactions and expenses.
 *
 * @phpstan-type HistoryRow array{type: string, id: int, reference: string, occurred_at: string, amount: int, payment_method: string, summary: string}
 */
class ListHistory
{
    /**
     * @param  array{date_from?: string|null, date_to?: string|null, type?: string|null}  $filters
     * @return LengthAwarePaginator<int, HistoryRow>
     */
    public function paginate(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $page = $this->query($filters)->paginate($perPage);
        $page->setCollection($this->withSummaries(collect($page->items())));

        return $page;
    }

    /**
     * @return Collection<int, HistoryRow>
     */
    public function recent(int $limit): Collection
    {
        return $this->withSummaries($this->query([])->limit($limit)->get());
    }

    /**
     * @param  array{date_from?: string|null, date_to?: string|null, type?: string|null}  $filters
     */
    private function query(array $filters): Builder
    {
        [$start, $endExclusive] = JakartaPeriod::bounds($filters['date_from'] ?? null, $filters['date_to'] ?? null);
        $type = $filters['type'] ?? null;

        $transactions = DB::table('transactions')
            ->whereNull('deleted_at')
            ->select([DB::raw("'transaction' as type"), 'id', 'reference', 'occurred_at', 'total_amount as amount', 'payment_method']);

        $expenses = DB::table('expenses')
            ->whereNull('deleted_at')
            ->select([DB::raw("'expense' as type"), 'id', 'reference', 'occurred_at', 'amount', 'payment_method']);

        foreach ([$transactions, $expenses] as $query) {
            $query->when($start, fn ($q) => $q->where('occurred_at', '>=', $start))
                ->when($endExclusive, fn ($q) => $q->where('occurred_at', '<', $endExclusive));
        }

        $source = match ($type) {
            'transaction' => $transactions,
            'expense' => $expenses,
            default => $transactions->unionAll($expenses),
        };

        return DB::query()
            ->fromSub($source, 'history')
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->orderBy('type');
    }

    /**
     * @param  Collection<int, stdClass>  $rows
     * @return Collection<int, HistoryRow>
     */
    private function withSummaries(Collection $rows): Collection
    {
        $items = TransactionItem::query()
            ->whereIn('transaction_id', $rows->where('type', 'transaction')->pluck('id'))
            ->orderBy('id')
            ->get()
            ->groupBy('transaction_id');

        $descriptions = Expense::query()
            ->whereIn('id', $rows->where('type', 'expense')->pluck('id'))
            ->pluck('description', 'id');

        return $rows->map(fn (stdClass $row) => [
            'type' => (string) $row->type,
            'id' => (int) $row->id,
            'reference' => (string) $row->reference,
            'occurred_at' => CarbonImmutable::parse($row->occurred_at)->utc()->toIso8601String(),
            'amount' => (int) $row->amount,
            'payment_method' => (string) $row->payment_method,
            'summary' => $row->type === 'transaction'
                ? $this->itemsSummary($items->get($row->id, collect()))
                : (string) $descriptions->get($row->id, ''),
        ]);
    }

    /**
     * @param  Collection<int, TransactionItem>  $items
     */
    private function itemsSummary(Collection $items): string
    {
        return $items
            ->map(fn (TransactionItem $item) => $item->quantity > 1
                ? "{$item->service_name_snapshot} ×{$item->quantity}"
                : $item->service_name_snapshot)
            ->implode(', ');
    }
}
