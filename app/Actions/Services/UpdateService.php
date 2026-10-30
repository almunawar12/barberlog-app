<?php

namespace App\Actions\Services;

use App\Models\Service;
use App\Models\ShopSetting;
use Illuminate\Support\Facades\DB;

class UpdateService
{
    /**
     * Editing a service never touches past transactions; they keep their snapshots.
     * Deactivating the default service clears the default instead of leaving an invalid one.
     *
     * @param  array{name: string, price: int, is_active?: bool}  $data
     */
    public function handle(Service $service, array $data): Service
    {
        return DB::transaction(function () use ($service, $data): Service {
            $service->update($data);

            if (! $service->is_active) {
                ShopSetting::query()
                    ->where('default_service_id', $service->id)
                    ->update(['default_service_id' => null]);
            }

            return $service;
        });
    }
}
