<?php

namespace App\Actions\Transactions;

use App\Models\Service;
use App\Models\TransactionItem;
use App\Support\Money;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Server-side recalculation of item totals. The client's totals are never trusted.
 */
class PrepareTransactionItems
{
    /**
     * @param  list<array{service_id: int, quantity: int, unit_price: int}>  $items  validated input
     * @param  Collection<int, TransactionItem>  $existing  current items keyed by service_id (empty when creating)
     * @return array{lines: list<array{service_id: int, service_name_snapshot: string, unit_price: int, quantity: int, line_total: int}>, total: int}
     */
    public function handle(array $items, Collection $existing): array
    {
        $services = Service::query()
            ->whereIn('id', array_column($items, 'service_id'))
            ->get()
            ->keyBy('id');

        $lines = [];
        $total = 0;

        foreach ($items as $index => $item) {
            $kept = $existing->get($item['service_id']);
            $service = $services->get($item['service_id']);

            // A service already on the transaction may stay even if it was deactivated since.
            if ($kept === null && ($service === null || ! $service->is_active)) {
                throw ValidationException::withMessages(["items.$index.service_id" => __('business.service_inactive')]);
            }

            $lineTotal = $item['unit_price'] * $item['quantity'];

            if ($lineTotal > Money::MAX_AMOUNT) {
                throw ValidationException::withMessages(['items' => __('business.total_too_large')]);
            }

            $total += $lineTotal;

            $lines[] = [
                'service_id' => $item['service_id'],
                // Keep the original snapshot for a retained service; snapshot the master name for a new one.
                'service_name_snapshot' => $kept !== null ? $kept->service_name_snapshot : $service->name,
                'unit_price' => $item['unit_price'],
                'quantity' => $item['quantity'],
                'line_total' => $lineTotal,
            ];
        }

        if ($total <= 0) {
            throw ValidationException::withMessages(['items' => __('business.total_must_be_positive')]);
        }

        if ($total > Money::MAX_AMOUNT) {
            throw ValidationException::withMessages(['items' => __('business.total_too_large')]);
        }

        return ['lines' => $lines, 'total' => $total];
    }
}
