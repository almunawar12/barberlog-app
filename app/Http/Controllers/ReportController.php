<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportRequest;
use App\Queries\Reports\ReportCsv;
use App\Queries\Reports\ReportSummary;
use App\Support\JakartaPeriod;
use Carbon\CarbonImmutable;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(ReportRequest $request, ReportSummary $summary): Response
    {
        $filters = $request->filters();
        $today = JakartaPeriod::today();

        return Inertia::render('reports', [
            'summary' => $summary->handle($filters['date_from'], $filters['date_to']),
            'presets' => [
                'today' => $today,
                'month_start' => CarbonImmutable::parse($today)->startOfMonth()->toDateString(),
            ],
        ]);
    }

    public function export(ReportRequest $request, ReportCsv $csv): StreamedResponse
    {
        return $csv->response($request->filters());
    }
}
