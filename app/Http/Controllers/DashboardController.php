<?php

namespace App\Http\Controllers;

use App\Queries\History\ListHistory;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(ListHistory $history): Response
    {
        return Inertia::render('dashboard', [
            'recent' => $history->recent(5)->values(),
        ]);
    }
}
