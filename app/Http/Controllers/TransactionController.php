<?php

namespace App\Http\Controllers;

use App\Actions\Transactions\CreateTransaction;
use App\Actions\Transactions\DeleteTransaction;
use App\Actions\Transactions\UpdateTransaction;
use App\Http\Requests\ExpectedVersionRequest;
use App\Http\Requests\TransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Service;
use App\Models\ShopSetting;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('transactions/create', [
            'services' => $this->selectableServices(),
            'default_service_id' => ShopSetting::current()->default_service_id,
        ]);
    }

    public function store(TransactionRequest $request, CreateTransaction $action): RedirectResponse
    {
        $action->handle($request->user(), $request->payload(), $request->string('idempotency_key')->toString());

        return redirect()->route('dashboard')->with('status', 'transaction-saved');
    }

    public function show(Transaction $transaction): Response
    {
        return Inertia::render('transactions/show', [
            'transaction' => TransactionResource::make($transaction->load('items'))->resolve(),
        ]);
    }

    public function edit(Transaction $transaction): Response
    {
        $transaction->load('items');

        return Inertia::render('transactions/edit', [
            'transaction' => TransactionResource::make($transaction)->resolve(),
            'services' => $this->selectableServices($transaction->items->map(fn (TransactionItem $item) => $item->service_id)->values()->all()),
        ]);
    }

    public function update(TransactionRequest $request, Transaction $transaction, UpdateTransaction $action): RedirectResponse
    {
        $updated = $action->handle(
            $request->user(),
            $transaction,
            $request->payload(),
            (int) $request->validated('expected_version'),
        );

        return redirect()->route('transactions.show', $updated)->with('status', 'transaction-updated');
    }

    public function destroy(ExpectedVersionRequest $request, Transaction $transaction, DeleteTransaction $action): RedirectResponse
    {
        $action->handle($request->user(), $transaction, $request->expectedVersion());

        return redirect()->route('history')->with('status', 'transaction-deleted');
    }

    /**
     * Active services, plus any already used by the record being edited (it may have been deactivated since).
     *
     * @param  array<int, int>  $includeIds
     * @return array<int, array{id: int, name: string, price: int}>
     */
    private function selectableServices(array $includeIds = []): array
    {
        return Service::query()
            ->where(fn ($query) => $query->where('is_active', true)->orWhereIn('id', $includeIds))
            ->orderBy('name')
            ->get(['id', 'name', 'price'])
            ->map(fn (Service $service) => ['id' => $service->id, 'name' => $service->name, 'price' => $service->price])
            ->values()
            ->all();
    }
}
