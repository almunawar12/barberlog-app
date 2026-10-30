<?php

use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\IdempotencyRequest;
use App\Models\ShopSetting;
use App\Models\Transaction;
use App\Models\User;
use App\Queries\Reports\ReportSummary;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(User::factory()->create(), ['*']);
});

describe('transactions', function () {
    it('creates with 201 and the documented resource shape', function () {
        $service = makeService();
        $payload = Arr::except(transactionPayload($service, ['note' => 'Rapi']), 'idempotency_key');

        $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/transactions', $payload)
            ->assertCreated()
            ->assertJsonPath('data.total_amount', 25000)
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.payment_method', 'cash')
            ->assertJsonPath('data.items.0.service_name', 'Potong Rambut')
            ->assertJsonPath('data.items.0.line_total', 25000)
            ->assertJsonStructure(['data' => ['id', 'reference', 'occurred_at', 'note', 'deleted_at', 'items']]);
    });

    it('replays the same Idempotency-Key with 200 and one record', function () {
        $payload = Arr::except(transactionPayload(makeService()), 'idempotency_key');
        $key = (string) Str::uuid();

        $first = $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/transactions', $payload)->assertCreated();
        $second = $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/transactions', $payload)->assertOk();

        expect($second->json('data.id'))->toBe($first->json('data.id'))
            ->and(Transaction::query()->count())->toBe(1)
            ->and(IdempotencyRequest::query()->count())->toBe(1);
    });

    it('answers 409 with a stable code when the key is reused with another payload', function () {
        $service = makeService();
        $payload = Arr::except(transactionPayload($service), 'idempotency_key');
        $key = (string) Str::uuid();
        $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/transactions', $payload)->assertCreated();

        $this->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/transactions', [...$payload, 'note' => 'beda'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'idempotency_key_conflict');
    });

    it('answers 422 with message and Indonesian errors', function () {
        $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/transactions', ['payment_method' => 'cash', 'occurred_at' => now()->toIso8601String(), 'items' => []])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['items']]);
    });

    it('requires an idempotency key', function () {
        $payload = Arr::except(transactionPayload(makeService()), 'idempotency_key');

        $this->postJson('/api/v1/transactions', $payload)->assertStatus(422)->assertJsonValidationErrors('idempotency_key');
    });

    it('reads, updates with the expected version, and rejects a stale one with 409', function () {
        $service = makeService();
        $payload = Arr::except(transactionPayload($service), 'idempotency_key');
        $id = $this->withHeader('Idempotency-Key', (string) Str::uuid())->postJson('/api/v1/transactions', $payload)->json('data.id');

        $this->getJson("/api/v1/transactions/{$id}")->assertOk()->assertJsonPath('data.version', 1);

        $update = [...$payload, 'items' => [['service_id' => $service->id, 'quantity' => 2, 'unit_price' => 25000]], 'expected_version' => 1];
        $this->putJson("/api/v1/transactions/{$id}", $update)
            ->assertOk()->assertJsonPath('data.total_amount', 50000)->assertJsonPath('data.version', 2);

        $this->putJson("/api/v1/transactions/{$id}", $update)
            ->assertStatus(409)->assertJsonPath('code', 'version_conflict');
    });

    it('deletes with 204, repeats as 204 and then hides the record', function () {
        $payload = Arr::except(transactionPayload(makeService()), 'idempotency_key');
        $id = $this->withHeader('Idempotency-Key', (string) Str::uuid())->postJson('/api/v1/transactions', $payload)->json('data.id');

        $this->deleteJson("/api/v1/transactions/{$id}", ['expected_version' => 1])->assertNoContent();
        $this->deleteJson("/api/v1/transactions/{$id}", ['expected_version' => 1])->assertNoContent();
        $this->getJson("/api/v1/transactions/{$id}")->assertNotFound();

        expect(AuditLog::query()->where('action', 'delete')->count())->toBe(1);
    });

    it('rejects a stale delete with 409 and needs expected_version', function () {
        $payload = Arr::except(transactionPayload(makeService()), 'idempotency_key');
        $id = $this->withHeader('Idempotency-Key', (string) Str::uuid())->postJson('/api/v1/transactions', $payload)->json('data.id');

        $this->deleteJson("/api/v1/transactions/{$id}", ['expected_version' => 9])->assertStatus(409);
        $this->deleteJson("/api/v1/transactions/{$id}")->assertStatus(422);
    });

    it('returns 404 for an unknown record', function () {
        $this->getJson('/api/v1/transactions/999999')->assertNotFound();
    });

    it('lists newest first with data and meta, filtered by Jakarta date', function () {
        seedTransaction('2026-10-29T09:00:00+07:00', 1000, 'Kemarin');
        seedTransaction('2026-10-30T00:05:00+07:00', 2000, 'Dini hari');
        seedTransaction('2026-10-30T09:00:00+07:00', 3000, 'Pagi');

        $this->getJson('/api/v1/transactions?date_from=2026-10-30&date_to=2026-10-30&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.total_amount', 3000)
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonCount(1, 'data');
    });

    it('caps per_page at 100', function () {
        $this->getJson('/api/v1/transactions?per_page=101')->assertStatus(422)->assertJsonValidationErrors('per_page');
    });
});

describe('expenses', function () {
    it('creates, replays, updates, conflicts and deletes', function () {
        $payload = Arr::except(expensePayload(), 'idempotency_key');
        $key = (string) Str::uuid();

        $created = $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/expenses', $payload)
            ->assertCreated()->assertJsonPath('data.amount', 15000)->assertJsonPath('data.category', 'supplies');
        $id = $created->json('data.id');

        $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/expenses', $payload)
            ->assertOk()->assertJsonPath('data.id', $id);
        expect(Expense::query()->count())->toBe(1);

        $this->putJson("/api/v1/expenses/{$id}", [...$payload, 'amount' => 20000, 'expected_version' => 1])
            ->assertOk()->assertJsonPath('data.version', 2);
        $this->putJson("/api/v1/expenses/{$id}", [...$payload, 'expected_version' => 1])
            ->assertStatus(409)->assertJsonPath('code', 'version_conflict');

        $this->deleteJson("/api/v1/expenses/{$id}", ['expected_version' => 2])->assertNoContent();
        $this->deleteJson("/api/v1/expenses/{$id}", ['expected_version' => 2])->assertNoContent();
        $this->getJson("/api/v1/expenses/{$id}")->assertNotFound();
    });

    it('validates with Indonesian messages', function () {
        $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/expenses', Arr::except(expensePayload(['amount' => '']), 'idempotency_key'))
            ->assertStatus(422)->assertJsonPath('errors.amount.0', 'Nominal wajib diisi.');
    });

    it('lists with data and meta', function () {
        seedExpense('2026-10-30T10:00:00+07:00', 4000);

        $this->getJson('/api/v1/expenses?date_from=2026-10-30&date_to=2026-10-30')
            ->assertOk()->assertJsonPath('data.0.amount', 4000)->assertJsonPath('meta.total', 1);
    });
});

describe('services and settings', function () {
    it('creates, lists and updates services', function () {
        $id = $this->postJson('/api/v1/services', ['name' => 'Cukur Jenggot', 'price' => 10000])
            ->assertCreated()->assertJsonPath('data.is_active', true)->json('data.id');

        $this->putJson("/api/v1/services/{$id}", ['name' => 'Cukur Jenggot', 'price' => 12000, 'is_active' => false])
            ->assertOk()->assertJsonPath('data.price', 12000)->assertJsonPath('data.is_active', false);

        $this->getJson('/api/v1/services')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/services', ['name' => 'X', 'price' => 12.5])->assertStatus(422)->assertJsonValidationErrors('price');
    });

    it('reads and updates settings', function () {
        $service = makeService();

        $this->getJson('/api/v1/settings')
            ->assertOk()->assertJsonPath('data.timezone', 'Asia/Jakarta')->assertJsonPath('data.currency', 'IDR');

        $this->putJson('/api/v1/settings', ['name' => 'Barber Jaya', 'default_service_id' => $service->id])
            ->assertOk()->assertJsonPath('data.name', 'Barber Jaya')->assertJsonPath('data.default_service_id', $service->id);

        expect(ShopSetting::current()->name)->toBe('Barber Jaya');
    });

    it('does not accept an inactive default service', function () {
        $inactive = makeService('Lama', 1000, active: false);

        $this->putJson('/api/v1/settings', ['name' => 'Barber', 'default_service_id' => $inactive->id])
            ->assertStatus(422)->assertJsonValidationErrors('default_service_id');
    });
});

describe('history, reports and dashboard', function () {
    it('serves the combined history with data and meta', function () {
        seedTransaction('2026-10-30T09:00:00+07:00', 25000);
        seedExpense('2026-10-30T10:00:00+07:00', 5000);

        $this->getJson('/api/v1/history?date_from=2026-10-30&date_to=2026-10-30')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'expense')
            ->assertJsonPath('data.1.type', 'transaction')
            ->assertJsonPath('meta.total', 2);
    });

    it('serves the same totals as the web report for the same filter', function () {
        seedTransaction('2026-10-30T09:00:00+07:00', 25000);
        seedExpense('2026-10-30T10:00:00+07:00', 5000);

        $api = $this->getJson('/api/v1/reports/summary?date_from=2026-10-30&date_to=2026-10-30')
            ->assertOk()->json('data');

        expect($api['total_income'])->toBe(25000)
            ->and($api['total_expense'])->toBe(5000)
            ->and($api['net_difference'])->toBe(20000)
            ->and($api)->toBe((new ReportSummary)->handle('2026-10-30', '2026-10-30'));
    });

    it('exports the CSV with the same filters', function () {
        seedTransaction('2026-10-30T09:00:00+07:00', 25000);

        $response = $this->get('/api/v1/reports/export?date_from=2026-10-30&date_to=2026-10-30');

        $response->assertOk()->assertDownload('barberlog-laporan.csv');
        expect($response->streamedContent())->toContain('Nomor referensi')->toContain('25000');
    });

    it('rejects an end date before the start date', function () {
        $this->getJson('/api/v1/reports/summary?date_from=2026-10-30&date_to=2026-10-01')
            ->assertStatus(422)->assertJsonValidationErrors('date_to');
    });

    it('serves the dashboard with today and recent records', function () {
        seedTransaction(now()->toIso8601String(), 25000);

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.total_income', 25000)
            ->assertJsonCount(1, 'data.recent');
    });

    it('shows web-created data to the API and the other way round', function () {
        $service = makeService();
        $this->actingAs(auth()->user() ?? User::query()->first());

        $this->post('/transactions', transactionPayload($service))->assertSessionHasNoErrors();
        $this->getJson('/api/v1/transactions')->assertJsonPath('data.0.total_amount', 25000);

        $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/expenses', Arr::except(expensePayload(), 'idempotency_key'))->assertCreated();
        $this->get('/history')->assertInertia(fn ($page) => $page->has('history.data', 2));
    });
});
