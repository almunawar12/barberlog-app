<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Transactions\CreateTransaction;
use App\Actions\Transactions\DeleteTransaction;
use App\Actions\Transactions\UpdateTransaction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ExpectedVersionRequest;
use App\Http\Requests\HistoryRequest;
use App\Http\Requests\TransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Support\JakartaPeriod;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TransactionController extends Controller
{
    public function index(HistoryRequest $request): AnonymousResourceCollection
    {
        [$start, $endExclusive] = JakartaPeriod::bounds($request->validated('date_from'), $request->validated('date_to'));

        $transactions = Transaction::query()
            ->with('items')
            ->when($start, fn ($query) => $query->where('occurred_at', '>=', $start))
            ->when($endExclusive, fn ($query) => $query->where('occurred_at', '<', $endExclusive))
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate((int) $request->validated('per_page', 20));

        return TransactionResource::collection($transactions);
    }

    /**
     * 201 for a new record, 200 when the same Idempotency-Key replays an earlier request.
     */
    public function store(TransactionRequest $request, CreateTransaction $action): TransactionResource
    {
        $transaction = $action->handle($request->user(), $request->payload(), $request->string('idempotency_key')->toString());

        return TransactionResource::make($transaction->load('items'));
    }

    public function show(Transaction $transaction): TransactionResource
    {
        return TransactionResource::make($transaction->load('items'));
    }

    public function update(TransactionRequest $request, Transaction $transaction, UpdateTransaction $action): TransactionResource
    {
        return TransactionResource::make($action->handle(
            $request->user(),
            $transaction,
            $request->payload(),
            (int) $request->validated('expected_version'),
        ));
    }

    public function destroy(ExpectedVersionRequest $request, Transaction $transaction, DeleteTransaction $action): Response
    {
        $action->handle($request->user(), $transaction, $request->expectedVersion());

        return response()->noContent();
    }
}
