<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * A write that must not proceed (HTTP 409). The stable English code is for clients;
 * the message is Indonesian display text.
 */
class BusinessConflict extends RuntimeException
{
    private function __construct(public readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }

    public static function versionConflict(): self
    {
        return new self('version_conflict', __('business.version_conflict'));
    }

    public static function idempotencyKeyReused(): self
    {
        return new self('idempotency_key_conflict', __('business.idempotency_key_conflict'));
    }

    public function render(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->is('api/*') || ($request->expectsJson() && ! $request->header('X-Inertia'))) {
            return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode], 409);
        }

        return back()->withErrors(['conflict' => $this->getMessage()]);
    }
}
