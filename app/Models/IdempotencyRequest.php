<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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

    public static function lookup(User $user, string $operation, string $key): ?self
    {
        return self::query()
            ->where('user_id', $user->id)
            ->where('operation', $operation)
            ->where('key', $key)
            ->first();
    }

    /**
     * Claim the key. INSERT ... ON CONFLICT DO NOTHING waits for a concurrent holder to
     * commit, then reports false, so exactly one request per key wins.
     */
    public static function reserve(User $user, string $operation, string $key, string $requestHash, string $resourceType, int $resourceId): bool
    {
        return DB::table('idempotency_requests')->insertOrIgnore([
            'user_id' => $user->id,
            'operation' => $operation,
            'key' => $key,
            'request_hash' => $requestHash,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'created_at' => now(),
        ]) === 1;
    }
}
