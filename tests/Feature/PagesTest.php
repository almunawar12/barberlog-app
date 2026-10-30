<?php

use App\Models\Expense;
use App\Models\ShopSetting;
use App\Models\Transaction;
use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

it('lists recent records on the home screen', function () {
    $service = makeService();
    $this->post('/transactions', transactionPayload($service));
    $this->post('/expenses', expensePayload());

    $this->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('recent', 2)
            ->where('recent.0.type', fn ($type) => in_array($type, ['transaction', 'expense'])));
});

it('shows an empty history before the first record', function () {
    $this->get('/history')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('history')->has('history.data', 0));
});

it('filters history by Jakarta date and type through the query string', function () {
    $this->post('/transactions', transactionPayload(makeService(), ['occurred_at' => '2026-10-30T00:05:00+07:00']));
    $this->post('/expenses', expensePayload(['occurred_at' => '2026-10-30T10:00:00+07:00']));

    $this->get('/history?date_from=2026-10-30&date_to=2026-10-30&type=transaction')
        ->assertInertia(fn ($page) => $page
            ->has('history.data', 1)
            ->where('history.data.0.type', 'transaction')
            ->where('filters.type', 'transaction'));

    $this->get('/history?date_from=2026-10-29&date_to=2026-10-29')
        ->assertInertia(fn ($page) => $page->has('history.data', 0));
});

it('rejects an end date before the start date', function () {
    $this->from('/history')->get('/history?date_from=2026-10-30&date_to=2026-10-01')
        ->assertSessionHasErrors('date_to');
});

it('preselects the default service on the new transaction form', function () {
    $service = makeService();
    makeService('Cukur Jenggot', 10000);
    ShopSetting::current()->update(['default_service_id' => $service->id]);

    $this->get('/transactions/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('transactions/create')
            ->has('services', 2)
            ->where('default_service_id', $service->id));
});

it('offers only active services on a new transaction but keeps a used inactive one when editing', function () {
    $used = makeService('Lama', 15000);
    $active = makeService('Baru', 20000);
    makeService('Tidak dipakai', 5000, active: false);
    $this->post('/transactions', transactionPayload($used));
    $used->update(['is_active' => false]);
    $transaction = Transaction::query()->sole();

    $this->get('/transactions/create')
        ->assertInertia(fn ($page) => $page->has('services', 1)->where('services.0.id', $active->id));

    $this->get("/transactions/{$transaction->id}/edit")
        ->assertInertia(fn ($page) => $page
            ->component('transactions/edit')
            ->has('services', 2)
            ->where('transaction.version', 1)
            ->where('transaction.items.0.service_name', 'Lama'));
});

it('shows transaction and expense details with the version needed for edits', function () {
    $this->post('/transactions', transactionPayload(makeService()));
    $this->post('/expenses', expensePayload());
    $transaction = Transaction::query()->sole();
    $expense = Expense::query()->sole();

    $this->get("/transactions/{$transaction->id}")
        ->assertInertia(fn ($page) => $page
            ->component('transactions/show')
            ->where('transaction.total_amount', 25000)
            ->where('transaction.payment_method', 'cash')
            ->where('transaction.version', 1));

    $this->get("/expenses/{$expense->id}")
        ->assertInertia(fn ($page) => $page
            ->component('expenses/show')
            ->where('expense.amount', 15000)
            ->where('expense.category', 'supplies'));

    $this->get('/expenses/create')->assertInertia(fn ($page) => $page->component('expenses/create'));
    $this->get("/expenses/{$expense->id}/edit")->assertInertia(fn ($page) => $page->component('expenses/edit'));
});

it('paginates history', function () {
    foreach (range(1, 22) as $minute) {
        $this->post('/expenses', expensePayload(['occurred_at' => now()->subMinutes($minute)->toIso8601String()]));
    }

    $this->get('/history')
        ->assertInertia(fn ($page) => $page
            ->has('history.data', 20)
            ->where('history.last_page', 2)
            ->where('history.next_page_url', fn ($url) => str_contains($url, 'page=2')));
});

it('keeps web route names pointing at web URLs, not the API', function () {
    expect(route('transactions.show', 1, absolute: false))->toBe('/transactions/1')
        ->and(route('expenses.store', absolute: false))->toBe('/expenses')
        ->and(route('api.v1.transactions.show', 1, absolute: false))->toBe('/api/v1/transactions/1');
});
