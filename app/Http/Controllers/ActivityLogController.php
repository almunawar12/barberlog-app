<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    private const PER_PAGE = 30;

    public function index(): Response
    {
        $logs = AuditLog::query()
            ->join('users', 'users.id', '=', 'audit_logs.user_id')
            ->orderByDesc('audit_logs.id')
            ->select('audit_logs.*', 'users.name as user_name')
            ->paginate(self::PER_PAGE)
            ->through(function (AuditLog $log) {
                $snapshot = $log->after_json ?? $log->before_json ?? [];

                return [
                    'id' => $log->id,
                    'user_name' => $log->getAttribute('user_name'),
                    'entity_type' => $log->entity_type,
                    'entity_id' => $log->entity_id,
                    'action' => $log->action,
                    // Transactions/expenses carry reference + amount; user changes carry a name.
                    'label' => $snapshot['reference'] ?? $snapshot['name'] ?? null,
                    'amount' => $snapshot['total_amount'] ?? $snapshot['amount'] ?? null,
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('activity-logs', ['logs' => $logs]);
    }
}
