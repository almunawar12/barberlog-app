<?php

namespace App\Http\Controllers;

use App\Queries\History\ListHistory;
use App\Queries\Reports\ReportSummary;
use App\Support\JakartaPeriod;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(ListHistory $history, ReportSummary $summary): Response
    {
        $today = JakartaPeriod::today();

        return Inertia::render('dashboard', [
            'summary' => $summary->handle($today, $today),
            'recent' => $history->recent(5)->values(),
        ]);
    }
}
