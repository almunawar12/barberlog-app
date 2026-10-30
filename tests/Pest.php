<?php

use App\Models\Service;
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
