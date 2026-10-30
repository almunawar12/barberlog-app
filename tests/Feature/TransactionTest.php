<?php

use App\Models\AuditLog;
use App\Models\IdempotencyRequest;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * @param  list<array<string, int>>  $items
 * @param  array<string, mixed>  $extra
 * @return array<string, mixed>
 */
function updatePayload(Transaction $transaction, array $items, int $version = 1, array $extra = []): array
{
    return [
        'occurred_at' => $transaction->occurred_at->toIso8601String(),
        'payment_method' => 'qris',
        'items' => $items,
        'note' => null,
        'expected_version' => $version,
        ...$extra,
    ];
}

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->actingAs($this->owner);
});

it('records one service as one transaction with the server-calculated total', function () {
    $service = makeService();

    $this->post('/transactions', transactionPayload($service, ['note' => 'Rapi']))
        ->assertRedirect('/dashboard')
        ->assertSessionHas('status', 'transaction-saved');

    $transaction = Transaction::query()->with('items')->sole();
    expect($transaction->total_amount)->toBe(25000)
        ->and($transaction->version)->toBe(1)
        ->and($transaction->reference)->toStartWith('TRX-')
        ->and($transaction->created_by)->toBe($this->owner->id)
        ->and($transaction->note)->toBe('Rapi')
        ->and($transaction->items)->toHaveCount(1)
        ->and($transaction->items[0]->service_name_snapshot)->toBe('Potong Rambut')
        ->and($transaction->items[0]->line_total)->toBe(25000);
});

it('sums two services into one transaction with two items', function () {
    $haircut = makeService('Potong Rambut', 25000);
    $beard = makeService('Cukur Jenggot', 10000);

    $this->post('/transactions', transactionPayload($haircut, [
        'items' => [
            ['service_id' => $haircut->id, 'quantity' => 1, 'unit_price' => 25000],
            ['service_id' => $beard->id, 'quantity' => 1, 'unit_price' => 10000],
        ],
    ]))->assertSessionHasNoErrors();

    $transaction = Transaction::query()->with('items')->sole();
    expect($transaction->total_amount)->toBe(35000)->and($transaction->items)->toHaveCount(2);
});

it('multiplies quantity by the actual price and ignores any client total', function () {
    $service = makeService();

    $this->post('/transactions', transactionPayload($service, [
        'items' => [['service_id' => $service->id, 'quantity' => 3, 'unit_price' => 20000]],
        'total_amount' => 1,
    ]))->assertSessionHasNoErrors();

    $transaction = Transaction::query()->with('items')->sole();
    expect($transaction->total_amount)->toBe(60000)
        ->and($transaction->items[0]->unit_price)->toBe(20000)
        ->and($transaction->items[0]->line_total)->toBe(60000);
});

it('keeps old transactions unchanged when the master service changes', function () {
    $service = makeService('Potong Rambut', 25000);
    $this->post('/transactions', transactionPayload($service));

    $service->update(['name' => 'Potong Premium', 'price' => 40000]);

    $item = Transaction::query()->with('items')->sole()->items[0];
    expect($item->service_name_snapshot)->toBe('Potong Rambut')->and($item->unit_price)->toBe(25000);
});

it('stores a Jakarta wall-clock time as the correct UTC instant', function () {
    $service = makeService();

    // 00:05 WIB on 30 Oct is still 29 Oct in UTC.
    $this->post('/transactions', transactionPayload($service, ['occurred_at' => '2026-10-30T00:05:00+07:00']));

    $stored = DB::selectOne("select occurred_at at time zone 'UTC' as utc from transactions");
    expect($stored->utc)->toStartWith('2026-10-29 17:05:00');
});

it('rejects invalid transactions', function (Closure $mutate, string $errorKey) {
    $service = makeService();
    $payload = $mutate(transactionPayload($service), $service);

    $this->from('/transactions/create')->post('/transactions', $payload)->assertSessionHasErrors($errorKey);

    expect(Transaction::query()->count())->toBe(0);
})->with([
    'no items' => [fn ($p) => [...$p, 'items' => []], 'items'],
    'zero total' => [fn ($p, $s) => [...$p, 'items' => [['service_id' => $s->id, 'quantity' => 1, 'unit_price' => 0]]], 'items'],
    'line above limit' => [fn ($p, $s) => [...$p, 'items' => [['service_id' => $s->id, 'quantity' => 2, 'unit_price' => 600000000]]], 'items'],
    'quantity zero' => [fn ($p, $s) => [...$p, 'items' => [['service_id' => $s->id, 'quantity' => 0, 'unit_price' => 1000]]], 'items.0.quantity'],
    'fractional price' => [fn ($p, $s) => [...$p, 'items' => [['service_id' => $s->id, 'quantity' => 1, 'unit_price' => 1000.5]]], 'items.0.unit_price'],
    'negative price' => [fn ($p, $s) => [...$p, 'items' => [['service_id' => $s->id, 'quantity' => 1, 'unit_price' => -1]]], 'items.0.unit_price'],
    'duplicate service' => [fn ($p, $s) => [...$p, 'items' => [['service_id' => $s->id, 'quantity' => 1, 'unit_price' => 1000], ['service_id' => $s->id, 'quantity' => 1, 'unit_price' => 1000]]], 'items.0.service_id'],
    'unknown service' => [fn ($p) => [...$p, 'items' => [['service_id' => 999999, 'quantity' => 1, 'unit_price' => 1000]]], 'items.0.service_id'],
    'future date' => [fn ($p) => [...$p, 'occurred_at' => now()->addDay()->toIso8601String()], 'occurred_at'],
    'bad payment method' => [fn ($p) => [...$p, 'payment_method' => 'bitcoin'], 'payment_method'],
    'missing key' => [fn ($p) => Arr::except($p, 'idempotency_key'), 'idempotency_key'],
    'key not a uuid' => [fn ($p) => [...$p, 'idempotency_key' => 'abc'], 'idempotency_key'],
]);

it('rejects an inactive service for a new transaction', function () {
    $inactive = makeService('Lama', 10000, active: false);

    $this->post('/transactions', transactionPayload($inactive))
        ->assertSessionHasErrors(['items.0.service_id' => 'Layanan ini sudah dinonaktifkan dan tidak bisa dipilih.']);
});

it('writes an audit entry with the new record', function () {
    $this->post('/transactions', transactionPayload(makeService()));

    $audit = AuditLog::query()->sole();
    $transaction = Transaction::query()->sole();
    expect($audit->action)->toBe('create')
        ->and($audit->entity_type)->toBe('transaction')
        ->and($audit->entity_id)->toBe($transaction->id)
        ->and($audit->before_json)->toBeNull()
        ->and($audit->after_json['total_amount'])->toBe(25000)
        ->and($audit->user_id)->toBe($this->owner->id);
});

it('rolls back the transaction and key when the audit write fails', function () {
    AuditLog::creating(fn () => throw new RuntimeException('audit down'));
    $this->withoutExceptionHandling();

    try {
        $this->post('/transactions', transactionPayload(makeService()));
    } catch (RuntimeException) {
        // expected
    }

    expect(Transaction::withTrashed()->count())->toBe(0)
        ->and(IdempotencyRequest::query()->count())->toBe(0);
});

describe('idempotency', function () {
    it('returns the same record when the same key and payload are retried', function () {
        $payload = transactionPayload(makeService());

        $this->post('/transactions', $payload)->assertSessionHasNoErrors();
        $this->post('/transactions', $payload)->assertSessionHasNoErrors()->assertRedirect('/dashboard');

        expect(Transaction::query()->count())->toBe(1)
            ->and(AuditLog::query()->count())->toBe(1)
            ->and(IdempotencyRequest::query()->count())->toBe(1);
    });

    it('accepts the key as an Idempotency-Key header', function () {
        $service = makeService();
        $payload = Arr::except(transactionPayload($service), 'idempotency_key');
        $key = (string) Str::uuid();

        $this->withHeader('Idempotency-Key', $key)->post('/transactions', $payload)->assertSessionHasNoErrors();
        $this->withHeader('Idempotency-Key', $key)->post('/transactions', $payload)->assertSessionHasNoErrors();

        expect(Transaction::query()->count())->toBe(1);
    });

    it('answers 409 when the same key arrives with a different payload', function () {
        $service = makeService();
        $payload = transactionPayload($service);
        $this->post('/transactions', $payload);

        $this->postJson('/transactions', [
            ...$payload,
            'items' => [['service_id' => $service->id, 'quantity' => 2, 'unit_price' => 25000]],
        ])->assertStatus(409)->assertJson(['code' => 'idempotency_key_conflict']);

        expect(Transaction::query()->count())->toBe(1);
    });

    it('treats a different key as a new transaction', function () {
        $service = makeService();

        $this->post('/transactions', transactionPayload($service));
        $this->post('/transactions', transactionPayload($service));

        expect(Transaction::query()->count())->toBe(2);
    });

    it('does not recreate or revert a record that was edited after the original request', function () {
        $service = makeService();
        $payload = transactionPayload($service);
        $this->post('/transactions', $payload);
        $transaction = Transaction::query()->sole();

        $this->put("/transactions/{$transaction->id}", [
            ...Arr::except($payload, 'idempotency_key'),
            'items' => [['service_id' => $service->id, 'quantity' => 2, 'unit_price' => 25000]],
            'expected_version' => 1,
        ])->assertSessionHasNoErrors();

        $this->post('/transactions', $payload)->assertSessionHasNoErrors();

        expect(Transaction::query()->count())->toBe(1)
            ->and($transaction->fresh()->total_amount)->toBe(50000);
    });

    it('does not resurrect a deleted record on replay', function () {
        $payload = transactionPayload(makeService());
        $this->post('/transactions', $payload);
        $transaction = Transaction::query()->sole();

        $this->delete("/transactions/{$transaction->id}", ['expected_version' => 1]);
        $this->post('/transactions', $payload)->assertSessionHasNoErrors();

        expect(Transaction::query()->count())->toBe(0)
            ->and(Transaction::withTrashed()->count())->toBe(1);
    });
});

describe('correction', function () {
    beforeEach(function () {
        $this->haircut = makeService('Potong Rambut', 25000);
        $this->beard = makeService('Cukur Jenggot', 10000);
        $this->post('/transactions', transactionPayload($this->haircut));
        $this->transaction = Transaction::query()->sole();
    });

    it('updates the record, bumps the version and audits before and after', function () {
        $this->put("/transactions/{$this->transaction->id}", updatePayload($this->transaction, [
            ['service_id' => $this->haircut->id, 'quantity' => 1, 'unit_price' => 25000],
            ['service_id' => $this->beard->id, 'quantity' => 1, 'unit_price' => 10000],
        ]))->assertRedirect("/transactions/{$this->transaction->id}");

        $fresh = $this->transaction->fresh('items');
        expect($fresh->total_amount)->toBe(35000)
            ->and($fresh->version)->toBe(2)
            ->and($fresh->payment_method->value)->toBe('qris')
            ->and($fresh->items)->toHaveCount(2);

        $audit = AuditLog::query()->where('action', 'update')->sole();
        expect($audit->before_json['total_amount'])->toBe(25000)
            ->and($audit->after_json['total_amount'])->toBe(35000);
    });

    it('keeps the original snapshot of a retained service but snapshots a newly added one', function () {
        $this->haircut->update(['name' => 'Potong Premium']);
        $this->beard->update(['name' => 'Cukur Rapi']);

        $this->put("/transactions/{$this->transaction->id}", updatePayload($this->transaction, [
            ['service_id' => $this->haircut->id, 'quantity' => 1, 'unit_price' => 25000],
            ['service_id' => $this->beard->id, 'quantity' => 1, 'unit_price' => 10000],
        ]))->assertSessionHasNoErrors();

        $names = $this->transaction->fresh('items')->items->pluck('service_name_snapshot', 'service_id');
        expect($names[$this->haircut->id])->toBe('Potong Rambut')
            ->and($names[$this->beard->id])->toBe('Cukur Rapi');
    });

    it('lets a deactivated service stay on the record but not be newly added', function () {
        $this->haircut->update(['is_active' => false]);
        $this->beard->update(['is_active' => false]);

        $this->put("/transactions/{$this->transaction->id}", updatePayload($this->transaction, [
            ['service_id' => $this->haircut->id, 'quantity' => 2, 'unit_price' => 25000],
        ]))->assertSessionHasNoErrors();

        $this->put("/transactions/{$this->transaction->id}", updatePayload($this->transaction, [
            ['service_id' => $this->beard->id, 'quantity' => 1, 'unit_price' => 10000],
        ], version: 2))->assertSessionHasErrors('items.0.service_id');
    });

    it('rejects a stale version with 409 and changes nothing', function () {
        $this->put("/transactions/{$this->transaction->id}", updatePayload($this->transaction, [
            ['service_id' => $this->haircut->id, 'quantity' => 2, 'unit_price' => 25000],
        ]))->assertSessionHasNoErrors();

        $this->putJson("/transactions/{$this->transaction->id}", updatePayload($this->transaction, [
            ['service_id' => $this->haircut->id, 'quantity' => 9, 'unit_price' => 25000],
        ], version: 1))->assertStatus(409)->assertJson(['code' => 'version_conflict']);

        expect($this->transaction->fresh()->total_amount)->toBe(50000)
            ->and($this->transaction->fresh()->version)->toBe(2);
    });

    it('shows an Indonesian conflict message on the web', function () {
        $this->from("/transactions/{$this->transaction->id}/edit")
            ->put("/transactions/{$this->transaction->id}", updatePayload($this->transaction, [
                ['service_id' => $this->haircut->id, 'quantity' => 1, 'unit_price' => 25000],
            ], version: 7))
            ->assertSessionHasErrors(['conflict' => 'Data ini sudah diubah dari perangkat lain. Muat ulang halaman, lalu coba lagi.']);
    });

    it('requires the expected version', function () {
        $payload = Arr::except(updatePayload($this->transaction, [
            ['service_id' => $this->haircut->id, 'quantity' => 1, 'unit_price' => 25000],
        ]), 'expected_version');

        $this->put("/transactions/{$this->transaction->id}", $payload)->assertSessionHasErrors('expected_version');
    });

    it('soft deletes with an audit entry and removes the record from active views', function () {
        $this->delete("/transactions/{$this->transaction->id}", ['expected_version' => 1])
            ->assertRedirect('/history');

        expect(Transaction::query()->count())->toBe(0)
            ->and(Transaction::withTrashed()->count())->toBe(1);

        $audit = AuditLog::query()->where('action', 'delete')->sole();
        expect($audit->before_json['total_amount'])->toBe(25000)->and($audit->after_json)->toBeNull();

        $this->get("/transactions/{$this->transaction->id}")->assertNotFound();
    });

    it('treats a repeated delete as a no-op without a second audit entry', function () {
        $this->delete("/transactions/{$this->transaction->id}", ['expected_version' => 1]);
        $this->delete("/transactions/{$this->transaction->id}", ['expected_version' => 1])
            ->assertSessionHasNoErrors();

        expect(AuditLog::query()->where('action', 'delete')->count())->toBe(1);
    });

    it('rejects deleting with a stale version', function () {
        $this->deleteJson("/transactions/{$this->transaction->id}", ['expected_version' => 5])
            ->assertStatus(409)->assertJson(['code' => 'version_conflict']);

        expect(Transaction::query()->count())->toBe(1);
    });
});

it('keeps guests out of every transaction route', function () {
    auth()->logout();
    $this->app['auth']->forgetGuards();

    $this->post('/transactions', [])->assertRedirect('/login');
    $this->put('/transactions/1', [])->assertRedirect('/login');
    $this->delete('/transactions/1')->assertRedirect('/login');
});
