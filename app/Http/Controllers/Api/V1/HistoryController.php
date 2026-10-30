<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\HistoryRequest;
use App\Queries\History\ListHistory;
use Illuminate\Http\JsonResponse;

class HistoryController extends Controller
{
    public function index(HistoryRequest $request, ListHistory $history): JsonResponse
    {
        /** @var array{date_from?: string|null, date_to?: string|null, type?: string|null} $filters */
        $filters = $request->safe()->only(['date_from', 'date_to', 'type']);
        $page = $history->paginate($filters, (int) $request->validated('per_page', 20));

        return response()->json([
            'data' => array_values($page->items()),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }
}
