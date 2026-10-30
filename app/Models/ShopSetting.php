<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $timezone
 * @property string $currency
 * @property int|null $default_service_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['id', 'name', 'default_service_id'])]
class ShopSetting extends Model
{
    public $incrementing = false;

    /**
     * The singleton shop row (id = 1), created on first access.
     */
    public static function current(): self
    {
        return self::firstOrCreate(['id' => 1], ['name' => config('app.name')]);
    }

    /**
     * @return BelongsTo<Service, $this>
     */
    public function defaultService(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'default_service_id');
    }
}
