<?php

namespace App\Actions\Settings;

use App\Models\ShopSetting;

class UpdateShopSettings
{
    /**
     * @param  array{name: string, default_service_id: int|null}  $data
     */
    public function handle(array $data): ShopSetting
    {
        $shop = ShopSetting::current();
        $shop->update($data);

        return $shop;
    }
}
