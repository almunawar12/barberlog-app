<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportRequest;
use App\Queries\Reports\ReportCsv;
use App\Queries\Reports\ReportSummary;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function summary(ReportRequest $request, ReportSummary $summary): JsonResponse
    {
        $filters = $request->filters();

        return response()->json(['data' => $summary->handle($filters['date_from'], $filters['date_to'])]);
    }

    public function export(ReportRequest $request, ReportCsv $csv): StreamedResponse
    {
        return $csv->response($request->filters());
    }
}
