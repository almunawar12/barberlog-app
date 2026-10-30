<?php

namespace App\Actions\Expenses;

use App\Exceptions\BusinessConflict;
use App\Exceptions\DuplicateSubmission;
use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\IdempotencyRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-type ExpenseInput array{occurred_at: string, description: string, category?: string|null, amount: int, payment_method: string}
 */
class CreateExpense
{
    public const OPERATION = 'create_expense';

    /**
     * Retrying with the same key and payload returns the original record; the same key
     * with a different payload is a conflict.
     *
     * @param  ExpenseInput  $data  validated input
     */
    public function handle(User $user, array $data, string $idempotencyKey): Expense
    {
        $requestHash = $this->requestHash($data);

        $existing = IdempotencyRequest::lookup($user, self::OPERATION, $idempotencyKey);

        if ($existing !== null) {
            return $this->replay($existing, $requestHash);
        }

        try {
            return DB::transaction(function () use ($user, $data, $idempotencyKey, $requestHash): Expense {
                $expense = Expense::forceCreate([
                    'reference' => Expense::nextReference(),
                    // Eloquent writes the wall-clock string without an offset, so convert to UTC first.
                    'occurred_at' => CarbonImmutable::parse($data['occurred_at'])->utc(),
                    'description' => $data['description'],
                    'category' => $data['category'] ?? null,
                    'amount' => $data['amount'],
                    'payment_method' => $data['payment_method'],
                    'created_by' => $user->id,
                    'version' => 1,
                ]);

                $claimed = IdempotencyRequest::reserve(
                    $user, self::OPERATION, $idempotencyKey, $requestHash, 'expense', $expense->id,
                );

                if (! $claimed) {
                    throw new DuplicateSubmission; // rolls back this attempt; the winner's record is returned below
                }

                AuditLog::record($user, 'expense', $expense->id, 'create', null, $expense->auditSnapshot());

                return $expense;
            });
        } catch (DuplicateSubmission) {
            $winner = IdempotencyRequest::lookup($user, self::OPERATION, $idempotencyKey);

            return $this->replay($winner ?? throw BusinessConflict::idempotencyKeyReused(), $requestHash);
        }
    }

    private function replay(IdempotencyRequest $existing, string $requestHash): Expense
    {
        if (! hash_equals($existing->request_hash, $requestHash)) {
            throw BusinessConflict::idempotencyKeyReused();
        }

        // Replays never resurrect: a record deleted since is returned as deleted.
        return Expense::withTrashed()->findOrFail($existing->resource_id);
    }

    /**
     * @param  ExpenseInput  $data
     */
    private function requestHash(array $data): string
    {
        return hash('sha256', json_encode([
            'occurred_at' => CarbonImmutable::parse($data['occurred_at'])->utc()->format('Y-m-d\TH:i:s'),
            'description' => trim($data['description']),
            'category' => $data['category'] ?? null,
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'],
        ], JSON_THROW_ON_ERROR));
    }
}
