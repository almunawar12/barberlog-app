<?php

use App\Models\Expense;
use App\Models\Service;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

// Concurrency tests need real commits visible to other processes, so no wrapping transaction.
// Their rows are really committed, so clear them afterwards or later Feature tests would see them.
pest()->extend(TestCase::class)
    ->use(DatabaseTruncation::class)
    ->afterEach(fn () => DB::statement('truncate table users, services restart identity cascade'))
    ->in('Concurrency');

function makeService(string $name = 'Potong Rambut', int $price = 25000, bool $active = true): Service
{
    return Service::create(['name' => $name, 'price' => $price, 'is_active' => $active]);
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function transactionPayload(Service $service, array $overrides = []): array
{
    return array_merge([
        'occurred_at' => now()->subMinute()->toIso8601String(),
        'payment_method' => 'cash',
        'items' => [['service_id' => $service->id, 'quantity' => 1, 'unit_price' => $service->price]],
        'note' => null,
        'idempotency_key' => (string) Str::uuid(),
    ], $overrides);
}

function seedTransaction(string $occurredAt, int $total = 25000, ?string $name = 'Potong Rambut', string $method = 'cash'): Transaction
{
    $service = Service::query()->where('name', $name)->first() ?? makeService($name ?? 'Layanan', $total);
    $transaction = Transaction::forceCreate([
        'reference' => Transaction::nextReference(),
        'occurred_at' => CarbonImmutable::parse($occurredAt)->utc(),
        'payment_method' => $method,
        'total_amount' => $total,
        'created_by' => User::query()->first()?->id ?? User::factory()->create()->id,
        'version' => 1,
    ]);
    $transaction->items()->create([
        'service_id' => $service->id,
        'service_name_snapshot' => $service->name,
        'unit_price' => $total,
        'quantity' => 1,
        'line_total' => $total,
    ]);

    return $transaction;
}

function seedExpense(string $occurredAt, int $amount = 15000, string $description = 'Silet', string $method = 'cash'): Expense
{
    return Expense::forceCreate([
        'reference' => Expense::nextReference(),
        'occurred_at' => CarbonImmutable::parse($occurredAt)->utc(),
        'description' => $description,
        'amount' => $amount,
        'payment_method' => $method,
        'created_by' => User::query()->first()?->id ?? User::factory()->create()->id,
        'version' => 1,
    ]);
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function expensePayload(array $overrides = []): array
{
    return array_merge([
        'occurred_at' => now()->subMinute()->toIso8601String(),
        'description' => 'Silet',
        'category' => 'supplies',
        'amount' => 15000,
        'payment_method' => 'cash',
        'idempotency_key' => (string) Str::uuid(),
    ], $overrides);
}
