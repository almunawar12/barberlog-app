<?php

use Illuminate\Support\Facades\DB;

it('pins the database session to UTC so stored instants are not shifted', function () {
    expect(DB::selectOne('show timezone')->TimeZone)->toBe('UTC');

    $instant = now()->setDate(2026, 10, 30)->setTime(0, 5, 0); // 00:05 UTC

    DB::table('services')->insert([
        'name' => 'Potong',
        'price' => 25000,
        'created_at' => $instant,
        'updated_at' => $instant,
    ]);

    $stored = DB::selectOne("select created_at at time zone 'UTC' as utc from services");

    expect($stored->utc)->toStartWith('2026-10-30 00:05:00');
});
