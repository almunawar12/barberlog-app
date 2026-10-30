<?php

namespace App\Http\Controllers;

use App\Http\Requests\HistoryRequest;
use App\Queries\History\ListHistory;
use Inertia\Inertia;
use Inertia\Response;

class HistoryController extends Controller
{
    public function index(HistoryRequest $request, ListHistory $history): Response
    {
        /** @var array{date_from?: string|null, date_to?: string|null, type?: string|null} $filters */
        $filters = $request->safe()->only(['date_from', 'date_to', 'type']);

        return Inertia::render('history', [
            'history' => $history->paginate($filters)->withQueryString(),
            'filters' => [
                'date_from' => $filters['date_from'] ?? null,
                'date_to' => $filters['date_to'] ?? null,
                'type' => $filters['type'] ?? null,
            ],
        ]);
    }
}
