<?php

namespace App\Actions\Services;

use App\Models\Service;

class CreateService
{
    /**
     * @param  array{name: string, price: int, is_active?: bool}  $data
     */
    public function handle(array $data): Service
    {
        return Service::create($data);
    }
}
