<?php

namespace App\Http\Resources;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Expense
 */
class ExpenseResource extends JsonResource
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
            'description' => $this->description,
            'category' => $this->category?->value,
            'amount' => $this->amount,
            'payment_method' => $this->payment_method->value,
            'version' => $this->version,
            'deleted_at' => $this->deleted_at?->utc()->toIso8601String(),
        ];
    }
}
