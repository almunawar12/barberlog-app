<?php

/**
 * Child process for concurrency tests. Waits on a shared advisory lock so that all
 * workers start their write at the same moment, then prints one JSON result line.
 *
 * Usage: php worker.php <base64 json job>
 */

use App\Actions\Transactions\CreateTransaction;
use App\Actions\Transactions\UpdateTransaction;
use App\Exceptions\BusinessConflict;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../../vendor/autoload.php';

$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

/** @var array{action: string, user_id: int, data: array<string, mixed>, key?: string, transaction_id?: int, expected_version?: int, barrier: int} $job */
$job = json_decode(base64_decode($argv[1]), true, flags: JSON_THROW_ON_ERROR);

try {
    $user = User::query()->findOrFail($job['user_id']);

    DB::select('select pg_advisory_lock_shared(?)', [$job['barrier']]);

    $result = match ($job['action']) {
        'create_transaction' => ['id' => app(CreateTransaction::class)->handle($user, $job['data'], $job['key'])->id],
        'update_transaction' => ['id' => app(UpdateTransaction::class)->handle(
            $user,
            Transaction::query()->findOrFail($job['transaction_id']),
            $job['data'],
            $job['expected_version'],
        )->id],
    };

    echo json_encode(['ok' => true, ...$result]);
} catch (BusinessConflict $conflict) {
    echo json_encode(['ok' => false, 'conflict' => $conflict->errorCode]);
} catch (Throwable $error) {
    echo json_encode(['ok' => false, 'error' => $error::class.': '.$error->getMessage()]);
}
