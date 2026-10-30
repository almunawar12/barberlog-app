<?php

use App\Models\ShopSetting;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('creates the owner and the shop settings row', function () {
    $this->artisan('owner:create', ['name' => 'Budi', 'email' => 'Budi@Example.com'])
        ->expectsQuestion('Kata sandi', 'rahasia-panjang-1')
        ->assertSuccessful();

    $owner = User::query()->sole();
    expect($owner->email)->toBe('budi@example.com')
        ->and(Hash::check('rahasia-panjang-1', $owner->password))->toBeTrue()
        ->and(ShopSetting::query()->count())->toBe(1);
});

it('refuses to create a second owner', function () {
    User::factory()->create();

    $this->artisan('owner:create', ['name' => 'Kedua', 'email' => 'dua@example.com'])
        ->assertFailed();

    expect(User::query()->count())->toBe(1);
});

it('resets the owner password and revokes tokens', function () {
    $owner = User::factory()->create();
    $owner->createToken('phone');

    $this->artisan('owner:reset-password')
        ->expectsQuestion('Kata sandi baru', 'sandi-baru-123')
        ->assertSuccessful();

    expect(Hash::check('sandi-baru-123', $owner->fresh()->password))->toBeTrue()
        ->and($owner->tokens()->count())->toBe(0);
});
