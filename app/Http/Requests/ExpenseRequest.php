<?php

namespace App\Http\Requests;

use App\Actions\Expenses\CreateExpense;
use App\Enums\ExpenseCategory;
use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

/**
 * @phpstan-import-type ExpenseInput from CreateExpense
 */
class ExpenseRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        // Mobile sends the key as a header; the web form sends it as a hidden field.
        if ($this->hasHeader('Idempotency-Key')) {
            $this->merge(['idempotency_key' => $this->header('Idempotency-Key')]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'occurred_at' => ['required', 'date', 'before_or_equal:now'],
            'description' => ['required', 'string', 'max:255'],
            'category' => ['nullable', Rule::enum(ExpenseCategory::class)],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999'],
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            ...($this->isMethod('POST')
                ? ['idempotency_key' => ['required', 'uuid']]
                : ['expected_version' => ['required', 'integer', 'min:1']]),
        ];
    }

    /**
     * @return ExpenseInput
     */
    public function payload(): array
    {
        /** @var ExpenseInput */
        return Arr::only($this->validated(), ['occurred_at', 'description', 'category', 'amount', 'payment_method']);
    }
}
