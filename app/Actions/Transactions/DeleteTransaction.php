<?php

namespace App\Actions\Transactions;

use App\Exceptions\BusinessConflict;
use App\Models\AuditLog;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeleteTransaction
{
    /**
     * Soft delete. Repeating the delete of an already deleted record is a no-op
     * (no second audit entry). This corrects the record only; no payment is refunded.
     */
    public function handle(User $user, Transaction $transaction, int $expectedVersion): void
    {
        DB::transaction(function () use ($user, $transaction, $expectedVersion): void {
            $locked = Transaction::withTrashed()->whereKey($transaction->id)->lockForUpdate()->firstOrFail();

            if ($locked->trashed()) {
                return;
            }

            if ($locked->version !== $expectedVersion) {
                throw BusinessConflict::versionConflict();
            }

            $locked->load('items');
            $before = $locked->auditSnapshot();

            $locked->forceFill(['version' => $locked->version + 1])->save();
            $locked->delete();

            AuditLog::record($user, 'transaction', $locked->id, 'delete', $before, null);
        });
    }
}
