<?php

namespace App\Http\Resources;

use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Transaction
 */
class TransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'occurred_at' => $this->occurred_at->utc()->toIso8601String(),
            'payment_method' => $this->payment_method->value,
            'total_amount' => $this->total_amount,
            'note' => $this->note,
            'version' => $this->version,
            'deleted_at' => $this->deleted_at?->utc()->toIso8601String(),
            'items' => $this->items->map(fn (TransactionItem $item) => [
                'id' => $item->id,
                'service_id' => $item->service_id,
                'service_name' => $item->service_name_snapshot,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
            ])->all(),
        ];
    }
}
