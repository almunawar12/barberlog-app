<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Expenses\CreateExpense;
use App\Actions\Expenses\DeleteExpense;
use App\Actions\Expenses\UpdateExpense;
use App\Http\Controllers\Controller;
use App\Http\Requests\ExpectedVersionRequest;
use App\Http\Requests\ExpenseRequest;
use App\Http\Requests\HistoryRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Support\JakartaPeriod;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ExpenseController extends Controller
{
    public function index(HistoryRequest $request): AnonymousResourceCollection
    {
        [$start, $endExclusive] = JakartaPeriod::bounds($request->validated('date_from'), $request->validated('date_to'));

        $expenses = Expense::query()
            ->when($start, fn ($query) => $query->where('occurred_at', '>=', $start))
            ->when($endExclusive, fn ($query) => $query->where('occurred_at', '<', $endExclusive))
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate((int) $request->validated('per_page', 20));

        return ExpenseResource::collection($expenses);
    }

    /**
     * 201 for a new record, 200 when the same Idempotency-Key replays an earlier request.
     */
    public function store(ExpenseRequest $request, CreateExpense $action): ExpenseResource
    {
        return ExpenseResource::make(
            $action->handle($request->user(), $request->payload(), $request->string('idempotency_key')->toString()),
        );
    }

    public function show(Expense $expense): ExpenseResource
    {
        return ExpenseResource::make($expense);
    }

    public function update(ExpenseRequest $request, Expense $expense, UpdateExpense $action): ExpenseResource
    {
        return ExpenseResource::make($action->handle(
            $request->user(),
            $expense,
            $request->payload(),
            (int) $request->validated('expected_version'),
        ));
    }

    public function destroy(ExpectedVersionRequest $request, Expense $expense, DeleteExpense $action): Response
    {
        $action->handle($request->user(), $expense, $request->expectedVersion());

        return response()->noContent();
    }
}
