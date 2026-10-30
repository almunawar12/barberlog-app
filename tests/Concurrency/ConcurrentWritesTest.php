<?php

use App\Actions\Transactions\CreateTransaction;
use App\Models\AuditLog;
use App\Models\IdempotencyRequest;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

const CONCURRENCY_BARRIER = 7421;

/**
 * Runs $workers child processes that all start their write at the same instant.
 *
 * @param  list<array<string, mixed>>  $jobs  one per worker
 * @return list<array<string, mixed>>
 */
function runConcurrently(array $jobs): array
{
    $env = [...getenv(), 'APP_ENV' => 'testing', 'DB_DATABASE' => config('database.connections.pgsql.database')];
    $processes = [];

    // Hold the barrier exclusively so every worker blocks on its shared lock request.
    DB::select('select pg_advisory_lock(?)', [CONCURRENCY_BARRIER]);

    try {
        foreach ($jobs as $job) {
            $command = [PHP_BINARY, __DIR__.'/worker.php', base64_encode(json_encode([...$job, 'barrier' => CONCURRENCY_BARRIER]))];
            $process = proc_open($command, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, base_path(), $env);
            $processes[] = [$process, $pipes];
        }

        $deadline = microtime(true) + 60;
        do {
            $waiting = DB::selectOne("select count(*) as n from pg_locks where locktype = 'advisory' and not granted")->n;
            usleep(100_000);
        } while ($waiting < count($jobs) && microtime(true) < $deadline);
    } finally {
        DB::select('select pg_advisory_unlock(?)', [CONCURRENCY_BARRIER]);
    }

    $results = [];
    foreach ($processes as [$process, $pipes]) {
        $output = stream_get_contents($pipes[1]);
        $errors = stream_get_contents($pipes[2]);
        proc_close($process);
        $results[] = json_decode($output, true) ?? ['ok' => false, 'error' => "no output: {$errors}"];
    }

    return $results;
}

it('creates exactly one transaction when the same submission arrives concurrently', function () {
    $user = User::factory()->create();
    $service = makeService();
    $payload = transactionPayload($service);

    $results = runConcurrently(array_fill(0, 5, [
        'action' => 'create_transaction',
        'user_id' => $user->id,
        'data' => Arr::except($payload, 'idempotency_key'),
        'key' => $payload['idempotency_key'],
    ]));

    expect(array_column($results, 'error'))->toBe([])
        ->and(array_column($results, 'ok'))->each->toBeTrue()
        ->and(array_unique(array_column($results, 'id')))->toHaveCount(1)
        ->and(Transaction::query()->count())->toBe(1)
        ->and(IdempotencyRequest::query()->count())->toBe(1)
        ->and(AuditLog::query()->count())->toBe(1)
        ->and(DB::table('transaction_items')->count())->toBe(1);
});

it('lets exactly one of several concurrent edits with the same version win', function () {
    $user = User::factory()->create();
    $service = makeService();
    $payload = transactionPayload($service);
    $original = app(CreateTransaction::class)
        ->handle($user, Arr::except($payload, 'idempotency_key'), $payload['idempotency_key']);

    $results = runConcurrently(array_map(fn (int $quantity) => [
        'action' => 'update_transaction',
        'user_id' => $user->id,
        'transaction_id' => $original->id,
        'expected_version' => 1,
        'data' => [
            ...Arr::except($payload, ['idempotency_key', 'items']),
            'items' => [['service_id' => $service->id, 'quantity' => $quantity, 'unit_price' => 25000]],
        ],
    ], [2, 3, 4, 5]));

    $winners = array_filter($results, fn (array $result) => $result['ok']);
    $losers = array_filter($results, fn (array $result) => ! $result['ok']);

    expect(array_column($results, 'error'))->toBe([])
        ->and($winners)->toHaveCount(1)
        ->and(array_unique(array_column($losers, 'conflict')))->toBe(['version_conflict'])
        ->and($original->fresh()->version)->toBe(2)
        ->and(AuditLog::query()->where('action', 'update')->count())->toBe(1)
        ->and($original->fresh('items')->items)->toHaveCount(1);
});
