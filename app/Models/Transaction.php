<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @property int $id
 * @property string $reference
 * @property Carbon $occurred_at
 * @property PaymentMethod $payment_method
 * @property int $total_amount
 * @property string|null $note
 * @property int $created_by
 * @property int $version
 * @property Carbon|null $deleted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['reference', 'occurred_at', 'payment_method', 'total_amount', 'note', 'created_by'])]
class Transaction extends Model
{
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'payment_method' => PaymentMethod::class,
            'total_amount' => 'integer',
            'version' => 'integer',
        ];
    }

    public static function nextReference(): string
    {
        $next = DB::selectOne("select nextval('transaction_reference_seq') as value")->value;

        return 'TRX-'.str_pad((string) $next, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Stable shape stored in audit_logs; items must be loaded.
     *
     * @return array<string, mixed>
     */
    public function auditSnapshot(): array
    {
        return [
            'reference' => $this->reference,
            'occurred_at' => $this->occurred_at->utc()->toIso8601String(),
            'payment_method' => $this->payment_method->value,
            'total_amount' => $this->total_amount,
            'note' => $this->note,
            'version' => $this->version,
            'items' => $this->items->map(fn (TransactionItem $item) => [
                'service_id' => $item->service_id,
                'service_name_snapshot' => $item->service_name_snapshot,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
            ])->all(),
        ];
    }

    /**
     * @return HasMany<TransactionItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
