<?php

use App\Models\Service;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function insertTransaction(array $overrides = []): void
{
    DB::table('transactions')->insert([
        'reference' => 'TRX-'.uniqid(),
        'occurred_at' => now(),
        'payment_method' => 'cash',
        'total_amount' => 25000,
        'created_by' => User::factory()->create()->id,
        ...$overrides,
    ]);
}

it('accepts a valid transaction row', function () {
    insertTransaction();

    expect(DB::table('transactions')->count())->toBe(1);
});

it('rejects invalid transaction rows at the database level', function (array $overrides) {
    insertTransaction($overrides);
})->with([
    'unknown payment method' => [['payment_method' => 'bitcoin']],
    'zero total' => [['total_amount' => 0]],
    'total above the limit' => [['total_amount' => 1000000000]],
])->throws(QueryException::class);

it('rejects a duplicate transaction reference', function () {
    insertTransaction(['reference' => 'TRX-1']);
    insertTransaction(['reference' => 'TRX-1']);
})->throws(QueryException::class);

it('rejects an item with zero quantity', function () {
    insertTransaction(['reference' => 'TRX-2']);
    $service = Service::create(['name' => 'Potong', 'price' => 25000]);

    DB::table('transaction_items')->insert([
        'transaction_id' => DB::table('transactions')->value('id'),
        'service_id' => $service->id,
        'service_name_snapshot' => 'Potong',
        'unit_price' => 25000,
        'quantity' => 0,
        'line_total' => 0,
    ]);
})->throws(QueryException::class);

it('rejects an expense with an unknown category', function () {
    DB::table('expenses')->insert([
        'reference' => 'EXP-1',
        'occurred_at' => now(),
        'description' => 'Silet',
        'category' => 'gaming',
        'amount' => 15000,
        'payment_method' => 'cash',
        'created_by' => User::factory()->create()->id,
    ]);
})->throws(QueryException::class);

it('keeps shop settings a singleton', function () {
    DB::table('shop_settings')->insert(['id' => 2, 'name' => 'Kedua']);
})->throws(QueryException::class);

it('allows only one idempotency row per user, operation and key', function () {
    $userId = User::factory()->create()->id;
    $row = [
        'user_id' => $userId,
        'operation' => 'create_transaction',
        'key' => '2f1f3a8e-6f5e-4a49-9b3b-0f0b6f2f9a11',
        'request_hash' => str_repeat('a', 64),
        'resource_type' => 'transaction',
        'resource_id' => 1,
    ];

    DB::table('idempotency_requests')->insert($row);
    DB::table('idempotency_requests')->insert($row);
})->throws(QueryException::class);
