<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Append-only record of business changes; never edited from the UI.
 *
 * @property int $id
 * @property int $user_id
 * @property string $entity_type
 * @property int $entity_id
 * @property string $action
 * @property array<string, mixed>|null $before_json
 * @property array<string, mixed>|null $after_json
 * @property Carbon|null $created_at
 */
#[Fillable(['user_id', 'entity_type', 'entity_id', 'action', 'before_json', 'after_json'])]
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'before_json' => 'array',
            'after_json' => 'array',
        ];
    }
}
