<?php

namespace App\Actions\Transactions;

use App\Exceptions\BusinessConflict;
use App\Models\AuditLog;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-import-type TransactionInput from CreateTransaction
 */
class UpdateTransaction
{
    public function __construct(private PrepareTransactionItems $prepareItems) {}

    /**
     * @param  TransactionInput  $data  validated input
     */
    public function handle(User $user, Transaction $transaction, array $data, int $expectedVersion): Transaction
    {
        return DB::transaction(function () use ($user, $transaction, $data, $expectedVersion): Transaction {
            // Row lock: of two concurrent edits only one passes the version check.
            $locked = Transaction::query()->whereKey($transaction->id)->lockForUpdate()->first()
                ?? throw (new ModelNotFoundException)->setModel(Transaction::class, [$transaction->id]);

            if ($locked->version !== $expectedVersion) {
                throw BusinessConflict::versionConflict();
            }

            $locked->load('items');
            $before = $locked->auditSnapshot();

            $prepared = $this->prepareItems->handle($data['items'], $locked->items->keyBy('service_id'));

            $locked->items()->delete();
            $locked->items()->createMany($prepared['lines']);

            $locked->forceFill([
                'occurred_at' => CarbonImmutable::parse($data['occurred_at'])->utc(),
                'payment_method' => $data['payment_method'],
                'total_amount' => $prepared['total'],
                'note' => $data['note'] ?? null,
                'version' => $locked->version + 1,
            ])->save();

            $locked->load('items');
            AuditLog::record($user, 'transaction', $locked->id, 'update', $before, $locked->auditSnapshot());

            return $locked;
        });
    }
}
