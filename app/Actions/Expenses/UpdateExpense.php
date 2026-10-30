<?php

namespace App\Actions\Expenses;

use App\Exceptions\BusinessConflict;
use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-import-type ExpenseInput from CreateExpense
 */
class UpdateExpense
{
    /**
     * @param  ExpenseInput  $data  validated input
     */
    public function handle(User $user, Expense $expense, array $data, int $expectedVersion): Expense
    {
        return DB::transaction(function () use ($user, $expense, $data, $expectedVersion): Expense {
            // Row lock: of two concurrent edits only one passes the version check.
            $locked = Expense::query()->whereKey($expense->id)->lockForUpdate()->first()
                ?? throw (new ModelNotFoundException)->setModel(Expense::class, [$expense->id]);

            if ($locked->version !== $expectedVersion) {
                throw BusinessConflict::versionConflict();
            }

            $before = $locked->auditSnapshot();

            $locked->forceFill([
                'occurred_at' => CarbonImmutable::parse($data['occurred_at'])->utc(),
                'description' => $data['description'],
                'category' => $data['category'] ?? null,
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'],
                'version' => $locked->version + 1,
            ])->save();

            AuditLog::record($user, 'expense', $locked->id, 'update', $before, $locked->auditSnapshot());

            return $locked;
        });
    }
}
