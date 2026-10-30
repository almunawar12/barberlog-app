<?php

namespace App\Models;

use App\Enums\ExpenseCategory;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @property int $id
 * @property string $reference
 * @property Carbon $occurred_at
 * @property string $description
 * @property ExpenseCategory|null $category
 * @property int $amount
 * @property PaymentMethod $payment_method
 * @property int $created_by
 * @property int $version
 * @property Carbon|null $deleted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['reference', 'occurred_at', 'description', 'category', 'amount', 'payment_method', 'created_by'])]
class Expense extends Model
{
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'category' => ExpenseCategory::class,
            'amount' => 'integer',
            'payment_method' => PaymentMethod::class,
            'version' => 'integer',
        ];
    }

    public static function nextReference(): string
    {
        $next = DB::selectOne("select nextval('expense_reference_seq') as value")->value;

        return 'EXP-'.str_pad((string) $next, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Stable shape stored in audit_logs.
     *
     * @return array<string, mixed>
     */
    public function auditSnapshot(): array
    {
        return [
            'reference' => $this->reference,
            'occurred_at' => $this->occurred_at->utc()->toIso8601String(),
            'description' => $this->description,
            'category' => $this->category?->value,
            'amount' => $this->amount,
            'payment_method' => $this->payment_method->value,
            'version' => $this->version,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
