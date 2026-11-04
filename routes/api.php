<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\HistoryController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\TransactionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:forgot-password');

    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/password', [AuthController::class, 'updatePassword']);

        Route::get('/dashboard', DashboardController::class);
        Route::get('/history', [HistoryController::class, 'index']);
        Route::get('/services', [ServiceController::class, 'index']);

        // Employees (pegawai) may record and view; everything below is admin-only.
        Route::apiResource('transactions', TransactionController::class)->only(['index', 'store', 'show']);
        Route::apiResource('expenses', ExpenseController::class)->only(['index', 'store', 'show']);

        Route::middleware('admin')->group(function () {
            Route::get('/reports/summary', [ReportController::class, 'summary']);
            Route::get('/reports/export', [ReportController::class, 'export']);

            Route::post('/services', [ServiceController::class, 'store']);
            Route::put('/services/{service}', [ServiceController::class, 'update']);

            // destroy resolves soft-deleted records too, so repeating a delete stays a 204 instead of a 404.
            Route::apiResource('transactions', TransactionController::class)->only(['update', 'destroy'])->withTrashed(['destroy']);
            Route::apiResource('expenses', ExpenseController::class)->only(['update', 'destroy'])->withTrashed(['destroy']);

            Route::get('/settings', [SettingsController::class, 'show']);
            Route::put('/settings', [SettingsController::class, 'update']);
        });
    });
});
