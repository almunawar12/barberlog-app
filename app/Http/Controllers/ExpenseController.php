<?php

namespace App\Http\Controllers;

use App\Actions\Expenses\CreateExpense;
use App\Actions\Expenses\DeleteExpense;
use App\Actions\Expenses\UpdateExpense;
use App\Http\Requests\ExpectedVersionRequest;
use App\Http\Requests\ExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('expenses/create');
    }

    public function store(ExpenseRequest $request, CreateExpense $action): RedirectResponse
    {
        $action->handle($request->user(), $request->payload(), $request->string('idempotency_key')->toString());

        return redirect()->route('dashboard')->with('status', 'expense-saved');
    }

    public function show(Expense $expense): Response
    {
        return Inertia::render('expenses/show', [
            'expense' => ExpenseResource::make($expense)->resolve(),
        ]);
    }

    public function edit(Expense $expense): Response
    {
        return Inertia::render('expenses/edit', [
            'expense' => ExpenseResource::make($expense)->resolve(),
        ]);
    }

    public function update(ExpenseRequest $request, Expense $expense, UpdateExpense $action): RedirectResponse
    {
        $updated = $action->handle(
            $request->user(),
            $expense,
            $request->payload(),
            (int) $request->validated('expected_version'),
        );

        return redirect()->route('expenses.show', $updated)->with('status', 'expense-updated');
    }

    public function destroy(ExpectedVersionRequest $request, Expense $expense, DeleteExpense $action): RedirectResponse
    {
        $action->handle($request->user(), $expense, $request->expectedVersion());

        return redirect()->route('history')->with('status', 'expense-deleted');
    }
}
