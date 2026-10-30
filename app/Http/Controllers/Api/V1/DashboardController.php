<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Queries\History\ListHistory;
use App\Queries\Reports\ReportSummary;
use App\Support\JakartaPeriod;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(ListHistory $history, ReportSummary $summary): JsonResponse
    {
        $today = JakartaPeriod::today();

        return response()->json(['data' => [
            'summary' => $summary->handle($today, $today),
            'recent' => $history->recent(5)->values(),
        ]]);
    }
}
