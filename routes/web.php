<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\HistoryController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/history', [HistoryController::class, 'index'])->name('history');

    // Employees (pegawai) may record and view; everything below is admin-only.
    Route::resource('transactions', TransactionController::class)->only(['create', 'store', 'show']);
    Route::resource('expenses', ExpenseController::class)->only(['create', 'store', 'show']);

    // Pengaturan stays open to employees for password and logout; shop and service data is admin-only.
    Route::get('/settings', [SettingsController::class, 'edit'])->name('settings.edit');

    Route::middleware('admin')->group(function () {
        Route::get('/reports', [ReportController::class, 'index'])->name('reports');
        Route::get('/reports/export', [ReportController::class, 'export'])->name('reports.export');

        // destroy resolves soft-deleted records too, so repeating a delete stays a no-op instead of a 404.
        Route::resource('transactions', TransactionController::class)->only(['edit', 'update', 'destroy'])->withTrashed(['destroy']);
        Route::resource('expenses', ExpenseController::class)->only(['edit', 'update', 'destroy'])->withTrashed(['destroy']);

        Route::resource('employees', EmployeeController::class)->only(['index', 'create', 'store', 'edit', 'update']);

        Route::get('/activity-logs', [ActivityLogController::class, 'index'])->name('activity-logs.index');

        Route::put('/settings', [SettingsController::class, 'update'])->name('settings.update');

        Route::post('/services', [ServiceController::class, 'store'])->name('services.store');
        Route::put('/services/{service}', [ServiceController::class, 'update'])->name('services.update');
    });
});
