<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExpectedVersionRequest extends FormRequest
{
    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return ['expected_version' => ['required', 'integer', 'min:1']];
    }

    public function expectedVersion(): int
    {
        return (int) $this->validated('expected_version');
    }
}
