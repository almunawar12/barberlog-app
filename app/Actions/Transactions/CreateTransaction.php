<?php

namespace App\Actions\Transactions;

use App\Exceptions\BusinessConflict;
use App\Exceptions\DuplicateSubmission;
use App\Models\AuditLog;
use App\Models\IdempotencyRequest;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-type TransactionInput array{occurred_at: string, payment_method: string, items: list<array{service_id: int, quantity: int, unit_price: int}>, note?: string|null}
 */
class CreateTransaction
{
    public const OPERATION = 'create_transaction';

    public function __construct(private PrepareTransactionItems $prepareItems) {}

    /**
     * Retrying with the same key and payload returns the original record; the same key
     * with a different payload is a conflict.
     *
     * @param  TransactionInput  $data  validated input
     */
    public function handle(User $user, array $data, string $idempotencyKey): Transaction
    {
        $requestHash = $this->requestHash($data);

        $existing = IdempotencyRequest::lookup($user, self::OPERATION, $idempotencyKey);

        if ($existing !== null) {
            return $this->replay($existing, $requestHash);
        }

        try {
            return DB::transaction(function () use ($user, $data, $idempotencyKey, $requestHash): Transaction {
                $prepared = $this->prepareItems->handle($data['items'], new Collection);

                $transaction = Transaction::forceCreate([
                    'reference' => Transaction::nextReference(),
                    // Eloquent writes the wall-clock string without an offset, so convert to UTC first.
                    'occurred_at' => CarbonImmutable::parse($data['occurred_at'])->utc(),
                    'payment_method' => $data['payment_method'],
                    'total_amount' => $prepared['total'],
                    'note' => $data['note'] ?? null,
                    'created_by' => $user->id,
                    'version' => 1,
                ]);
                $transaction->items()->createMany($prepared['lines']);

                $claimed = IdempotencyRequest::reserve(
                    $user, self::OPERATION, $idempotencyKey, $requestHash, 'transaction', $transaction->id,
                );

                if (! $claimed) {
                    throw new DuplicateSubmission; // rolls back this attempt; the winner's record is returned below
                }

                $transaction->load('items');
                AuditLog::record($user, 'transaction', $transaction->id, 'create', null, $transaction->auditSnapshot());

                return $transaction;
            });
        } catch (DuplicateSubmission) {
            $winner = IdempotencyRequest::lookup($user, self::OPERATION, $idempotencyKey);

            return $this->replay($winner ?? throw BusinessConflict::idempotencyKeyReused(), $requestHash);
        }
    }

    private function replay(IdempotencyRequest $existing, string $requestHash): Transaction
    {
        if (! hash_equals($existing->request_hash, $requestHash)) {
            throw BusinessConflict::idempotencyKeyReused();
        }

        // Replays never resurrect: a record deleted since is returned as deleted.
        return Transaction::withTrashed()->with('items')->findOrFail($existing->resource_id);
    }

    /**
     * @param  TransactionInput  $data
     */
    private function requestHash(array $data): string
    {
        $note = isset($data['note']) ? trim($data['note']) : '';

        return hash('sha256', json_encode([
            'occurred_at' => CarbonImmutable::parse($data['occurred_at'])->utc()->format('Y-m-d\TH:i:s'),
            'payment_method' => $data['payment_method'],
            'items' => array_map(fn (array $item) => [$item['service_id'], $item['quantity'], $item['unit_price']], $data['items']),
            'note' => $note === '' ? null : $note,
        ], JSON_THROW_ON_ERROR));
    }
}
