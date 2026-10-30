<?php

namespace App\Http\Controllers;

use App\Actions\Services\CreateService;
use App\Actions\Services\UpdateService;
use App\Http\Requests\ServiceRequest;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;

class ServiceController extends Controller
{
    public function store(ServiceRequest $request, CreateService $action): RedirectResponse
    {
        /** @var array{name: string, price: int, is_active?: bool} $data */
        $data = $request->validated();
        $action->handle($data);

        return back()->with('status', 'service-saved');
    }

    public function update(ServiceRequest $request, Service $service, UpdateService $action): RedirectResponse
    {
        /** @var array{name: string, price: int, is_active?: bool} $data */
        $data = $request->validated();
        $action->handle($service, $data);

        return back()->with('status', 'service-saved');
    }
}
