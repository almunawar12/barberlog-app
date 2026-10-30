<?php

namespace App\Http\Requests;

use App\Support\JakartaPeriod;
use Illuminate\Foundation\Http\FormRequest;

class ReportRequest extends FormRequest
{
    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'type' => ['nullable', 'in:transaction,expense'],
        ];
    }

    /**
     * Missing dates default to today (Jakarta): no dates is today; a lone date_from runs through today.
     *
     * @return array{date_from: string, date_to: string, type: string|null}
     */
    public function filters(): array
    {
        $today = JakartaPeriod::today();
        $from = $this->validated('date_from') ?? $this->validated('date_to') ?? $today;
        $to = $this->validated('date_to') ?? max($from, $today);

        return ['date_from' => $from, 'date_to' => $to, 'type' => $this->validated('type')];
    }
}
