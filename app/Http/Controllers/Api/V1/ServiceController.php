<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Services\CreateService;
use App\Actions\Services\UpdateService;
use App\Http\Controllers\Controller;
use App\Http\Requests\ServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ServiceController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return ServiceResource::collection(Service::query()->orderBy('name')->get());
    }

    public function store(ServiceRequest $request, CreateService $action): ServiceResource
    {
        /** @var array{name: string, price: int, is_active?: bool} $data */
        $data = $request->validated();

        return ServiceResource::make($action->handle($data));
    }

    public function update(ServiceRequest $request, Service $service, UpdateService $action): ServiceResource
    {
        /** @var array{name: string, price: int, is_active?: bool} $data */
        $data = $request->validated();

        return ServiceResource::make($action->handle($service, $data));
    }
}
