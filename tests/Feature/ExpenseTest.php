<?php

use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\IdempotencyRequest;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->actingAs($this->owner);
});

it('records an expense with an audit entry', function () {
    $this->post('/expenses', expensePayload())
        ->assertRedirect('/dashboard')
        ->assertSessionHas('status', 'expense-saved');

    $expense = Expense::query()->sole();
    expect($expense->amount)->toBe(15000)
        ->and($expense->description)->toBe('Silet')
        ->and($expense->category->value)->toBe('supplies')
        ->and($expense->reference)->toStartWith('EXP-')
        ->and($expense->version)->toBe(1)
        ->and(AuditLog::query()->where('entity_type', 'expense')->sole()->action)->toBe('create');
});

it('allows an expense without a category', function () {
    $this->post('/expenses', expensePayload(['category' => null]))->assertSessionHasNoErrors();

    expect(Expense::query()->sole()->category)->toBeNull();
});

it('rejects invalid expenses', function (array $override, string $errorKey) {
    $this->from('/expenses/create')->post('/expenses', expensePayload($override))->assertSessionHasErrors($errorKey);

    expect(Expense::query()->count())->toBe(0);
})->with([
    'no description' => [['description' => ''], 'description'],
    'zero amount' => [['amount' => 0], 'amount'],
    'negative amount' => [['amount' => -5], 'amount'],
    'fractional amount' => [['amount' => 100.5], 'amount'],
    'above limit' => [['amount' => 1000000000], 'amount'],
    'unknown category' => [['category' => 'gaming'], 'category'],
    'future date' => [['occurred_at' => '2999-01-01T00:00:00+07:00'], 'occurred_at'],
    'bad payment method' => [['payment_method' => 'bitcoin'], 'payment_method'],
]);

it('shows Indonesian validation messages', function () {
    $this->post('/expenses', expensePayload(['amount' => '']))
        ->assertSessionHasErrors(['amount' => 'Nominal wajib diisi.']);
});

describe('idempotency', function () {
    it('returns the same record when the same key and payload are retried', function () {
        $payload = expensePayload();

        $this->post('/expenses', $payload)->assertSessionHasNoErrors();
        $this->post('/expenses', $payload)->assertSessionHasNoErrors();

        expect(Expense::query()->count())->toBe(1)
            ->and(IdempotencyRequest::query()->count())->toBe(1)
            ->and(AuditLog::query()->count())->toBe(1);
    });

    it('answers 409 when the same key arrives with a different payload', function () {
        $payload = expensePayload();
        $this->post('/expenses', $payload);

        $this->postJson('/expenses', [...$payload, 'amount' => 99000])
            ->assertStatus(409)->assertJson(['code' => 'idempotency_key_conflict']);

        expect(Expense::query()->count())->toBe(1);
    });

    it('does not resurrect a deleted expense on replay', function () {
        $payload = expensePayload();
        $this->post('/expenses', $payload);
        $expense = Expense::query()->sole();

        $this->delete("/expenses/{$expense->id}", ['expected_version' => 1]);
        $this->post('/expenses', $payload)->assertSessionHasNoErrors();

        expect(Expense::query()->count())->toBe(0)->and(Expense::withTrashed()->count())->toBe(1);
    });

    it('keeps a key scoped per operation', function () {
        $key = (string) Str::uuid();
        $service = makeService();

        $this->post('/transactions', transactionPayload($service, ['idempotency_key' => $key]));
        $this->post('/expenses', expensePayload(['idempotency_key' => $key]))->assertSessionHasNoErrors();

        expect(Expense::query()->count())->toBe(1);
    });
});

describe('correction', function () {
    beforeEach(function () {
        $this->post('/expenses', expensePayload());
        $this->expense = Expense::query()->sole();
    });

    it('updates, bumps the version and audits before and after', function () {
        $this->put("/expenses/{$this->expense->id}", [
            ...Arr::except(expensePayload(), 'idempotency_key'),
            'amount' => 20000,
            'expected_version' => 1,
        ])->assertRedirect("/expenses/{$this->expense->id}");

        expect($this->expense->fresh()->amount)->toBe(20000)->and($this->expense->fresh()->version)->toBe(2);

        $audit = AuditLog::query()->where('action', 'update')->sole();
        expect($audit->before_json['amount'])->toBe(15000)->and($audit->after_json['amount'])->toBe(20000);
    });

    it('rejects a stale version with 409', function () {
        $this->putJson("/expenses/{$this->expense->id}", [
            ...Arr::except(expensePayload(), 'idempotency_key'),
            'expected_version' => 3,
        ])->assertStatus(409)->assertJson(['code' => 'version_conflict']);

        expect($this->expense->fresh()->version)->toBe(1);
    });

    it('soft deletes once and ignores a repeated delete', function () {
        $this->delete("/expenses/{$this->expense->id}", ['expected_version' => 1])->assertRedirect('/history');
        $this->delete("/expenses/{$this->expense->id}", ['expected_version' => 1])->assertSessionHasNoErrors();

        expect(Expense::query()->count())->toBe(0)
            ->and(AuditLog::query()->where('action', 'delete')->count())->toBe(1);

        $this->get("/expenses/{$this->expense->id}")->assertNotFound();
    });

    it('rejects deleting with a stale version', function () {
        $this->deleteJson("/expenses/{$this->expense->id}", ['expected_version' => 4])->assertStatus(409);

        expect(Expense::query()->count())->toBe(1);
    });
});
