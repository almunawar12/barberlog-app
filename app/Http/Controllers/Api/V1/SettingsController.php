<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Settings\UpdateShopSettings;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateShopSettingsRequest;
use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return $this->respond(ShopSetting::current());
    }

    public function update(UpdateShopSettingsRequest $request, UpdateShopSettings $action): JsonResponse
    {
        /** @var array{name: string, default_service_id: int|null} $data */
        $data = $request->validated();

        return $this->respond($action->handle($data));
    }

    private function respond(ShopSetting $shop): JsonResponse
    {
        return response()->json(['data' => [
            'name' => $shop->name,
            'timezone' => $shop->timezone,
            'currency' => $shop->currency,
            'default_service_id' => $shop->default_service_id,
        ]]);
    }
}
