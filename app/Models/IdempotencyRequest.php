<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $operation
 * @property string $key
 * @property string $request_hash
 * @property string $resource_type
 * @property int $resource_id
 * @property Carbon|null $created_at
 */
#[Fillable(['user_id', 'operation', 'key', 'request_hash', 'resource_type', 'resource_id'])]
class IdempotencyRequest extends Model
{
    public const UPDATED_AT = null;
}
