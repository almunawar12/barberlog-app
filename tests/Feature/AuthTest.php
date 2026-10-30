<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

it('redirects guests away from business pages', function (string $path) {
    $this->get($path)->assertRedirect('/login');
})->with(['/dashboard', '/settings']);

it('logs the owner in with valid credentials', function () {
    $user = User::factory()->create();

    $this->post('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertRedirect('/dashboard');

    $this->assertAuthenticatedAs($user);
});

it('rejects a wrong password with an Indonesian message', function () {
    $user = User::factory()->create();

    $this->from('/login')
        ->post('/login', ['email' => $user->email, 'password' => 'wrong-password'])
        ->assertSessionHasErrors(['email' => 'Email atau kata sandi salah.']);

    $this->assertGuest();
});

it('has no public registration', function () {
    $this->post('/register', [
        'name' => 'Intruder',
        'email' => 'intruder@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    expect(User::query()->count())->toBe(0);
});

it('gives the same forgot-password reply for unknown and known emails', function () {
    Notification::fake();
    $user = User::factory()->create();

    $known = $this->from('/forgot-password')->post('/forgot-password', ['email' => $user->email]);
    $unknown = $this->from('/forgot-password')->post('/forgot-password', ['email' => 'nobody@example.com']);

    $known->assertSessionHasNoErrors();
    $unknown->assertSessionHasNoErrors();
    expect(session('status'))->toBe('Jika email terdaftar, tautan pemulihan akan dikirim.');
});

it('revokes tokens and other sessions after a password reset', function () {
    $user = User::factory()->create();
    $user->createToken('phone');
    DB::table('sessions')->insert(['id' => 'old-session', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

    $this->post('/reset-password', [
        'token' => Password::createToken($user),
        'email' => $user->email,
        'password' => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ])->assertRedirect('/login');

    expect($user->tokens()->count())->toBe(0)
        ->and(DB::table('sessions')->where('user_id', $user->id)->count())->toBe(0);
});

it('requires the current password and revokes other devices when changing it', function () {
    $user = User::factory()->create();
    $user->createToken('phone');
    DB::table('sessions')->insert(['id' => 'other-device', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

    $this->actingAs($user)->from('/settings')
        ->put('/user/password', [
            'current_password' => 'not-my-password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertSessionHasErrors(['current_password' => 'Kata sandi saat ini salah.']);

    expect($user->tokens()->count())->toBe(1);

    $this->actingAs($user)->from('/settings')
        ->put('/user/password', [
            'current_password' => 'password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertSessionHasNoErrors();

    expect($user->tokens()->count())->toBe(0)
        ->and(DB::table('sessions')->where('id', 'other-device')->exists())->toBeFalse();
});

it('expires mobile tokens after 30 days', function () {
    expect(config('sanctum.expiration'))->toBe(60 * 24 * 30);
});
