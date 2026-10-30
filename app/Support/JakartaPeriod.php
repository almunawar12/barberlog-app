<?php

namespace App\Support;

use Carbon\CarbonImmutable;

class JakartaPeriod
{
    public const TIMEZONE = 'Asia/Jakarta';

    /**
     * UTC bounds for Jakarta calendar dates (Y-m-d): the start is inclusive and the
     * end is the first instant of the day after $to, exclusive. Null leaves a side open.
     *
     * @return array{0: CarbonImmutable|null, 1: CarbonImmutable|null}
     */
    public static function bounds(?string $from, ?string $to): array
    {
        $start = $from === null
            ? null
            : CarbonImmutable::parse($from, self::TIMEZONE)->startOfDay()->utc();

        $endExclusive = $to === null
            ? null
            : CarbonImmutable::parse($to, self::TIMEZONE)->addDay()->startOfDay()->utc();

        return [$start, $endExclusive];
    }

    /** Today's Jakarta date as Y-m-d. */
    public static function today(): string
    {
        return CarbonImmutable::now(self::TIMEZONE)->toDateString();
    }
}
