<?php

namespace App\Http\Controllers;

use App\Actions\Settings\UpdateShopSettings;
use App\Http\Requests\UpdateShopSettingsRequest;
use App\Models\Service;
use App\Models\ShopSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        if (! $request->user()?->isAdmin()) {
            return Inertia::render('settings', ['shop' => null, 'services' => []]);
        }

        $shop = ShopSetting::current();

        return Inertia::render('settings', [
            'shop' => [
                'name' => $shop->name,
                'default_service_id' => $shop->default_service_id,
            ],
            'services' => Service::query()->orderBy('name')->get(['id', 'name', 'price', 'is_active']),
        ]);
    }

    public function update(UpdateShopSettingsRequest $request, UpdateShopSettings $action): RedirectResponse
    {
        /** @var array{name: string, default_service_id: int|null} $data */
        $data = $request->validated();
        $action->handle($data);

        return back()->with('status', 'shop-updated');
    }
}
