<?php

namespace App\Http\Requests;

use App\Actions\Transactions\CreateTransaction;
use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

/**
 * @phpstan-import-type TransactionInput from CreateTransaction
 */
class TransactionRequest extends FormRequest
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
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.service_id' => ['required', 'integer', 'distinct', 'exists:services,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'items.*.unit_price' => ['required', 'integer', 'min:0', 'max:999999999'],
            'note' => ['nullable', 'string', 'max:500'],
            ...($this->isMethod('POST')
                ? ['idempotency_key' => ['required', 'uuid']]
                : ['expected_version' => ['required', 'integer', 'min:1']]),
        ];
    }

    /**
     * @return TransactionInput
     */
    public function payload(): array
    {
        /** @var TransactionInput */
        return Arr::only($this->validated(), ['occurred_at', 'payment_method', 'items', 'note']);
    }
}
