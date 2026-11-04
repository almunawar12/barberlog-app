<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\PersonalAccessToken;

function apiLogin(User $user, string $device = 'Pixel 8'): array
{
    return test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => $device,
    ])->assertOk()->json('data');
}

function asToken(string $token): void
{
    // Each request must authenticate from its own Bearer token, not from a cached guard user.
    app('auth')->forgetGuards();
    test()->withToken($token);
}

it('logs in with a Bearer token valid for 30 days', function () {
    $user = User::factory()->create();

    $data = apiLogin($user);

    expect($data['user'])->toBe(['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => 'admin'])
        ->and($data['token'])->toBeString()->not->toBeEmpty()
        ->and(now()->addDays(30)->diffInMinutes($data['expires_at'], absolute: true))->toBeLessThan(2);

    asToken($data['token']);
    $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.email', $user->email);
});

it('rejects bad credentials with an Indonesian message and issues no token', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'salah', 'device_name' => 'Pixel'])
        ->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'Email atau kata sandi salah.');

    expect(PersonalAccessToken::query()->count())->toBe(0);
});

it('requires a device name', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])
        ->assertStatus(422)->assertJsonValidationErrors('device_name');
});

it('throttles repeated failed logins with 429', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'salah', 'device_name' => 'Pixel'])->assertStatus(422);
    }

    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password', 'device_name' => 'Pixel'])
        ->assertStatus(429);
});

it('answers 401 as JSON for every business endpoint without a token', function (string $method, string $path) {
    $this->json($method, $path)->assertStatus(401)->assertJsonStructure(['message']);
})->with([
    ['GET', '/api/v1/auth/me'],
    ['POST', '/api/v1/auth/logout'],
    ['PUT', '/api/v1/auth/password'],
    ['GET', '/api/v1/dashboard'],
    ['GET', '/api/v1/history'],
    ['GET', '/api/v1/reports/summary'],
    ['GET', '/api/v1/reports/export'],
    ['GET', '/api/v1/services'],
    ['POST', '/api/v1/services'],
    ['PUT', '/api/v1/services/1'],
    ['GET', '/api/v1/transactions'],
    ['POST', '/api/v1/transactions'],
    ['GET', '/api/v1/transactions/1'],
    ['PUT', '/api/v1/transactions/1'],
    ['DELETE', '/api/v1/transactions/1'],
    ['GET', '/api/v1/expenses'],
    ['POST', '/api/v1/expenses'],
    ['GET', '/api/v1/expenses/1'],
    ['PUT', '/api/v1/expenses/1'],
    ['DELETE', '/api/v1/expenses/1'],
    ['GET', '/api/v1/settings'],
    ['PUT', '/api/v1/settings'],
]);

it('answers 401 as JSON even when the client forgets the Accept header', function () {
    $this->get('/api/v1/dashboard')->assertStatus(401)->assertJsonStructure(['message']);
});

it('rejects a malformed or revoked token', function () {
    app('auth')->forgetGuards();
    $this->withToken('999|not-a-real-token')->getJson('/api/v1/auth/me')->assertStatus(401);
});

it('expires tokens after 30 days', function () {
    $user = User::factory()->create();
    $token = apiLogin($user)['token'];

    $this->travel(29)->days();
    asToken($token);
    $this->getJson('/api/v1/auth/me')->assertOk();

    $this->travel(2)->days();
    asToken($token);
    $this->getJson('/api/v1/auth/me')->assertStatus(401);
});

it('logout revokes only the current device token', function () {
    $user = User::factory()->create();
    $phone = apiLogin($user, 'Phone')['token'];
    $tablet = apiLogin($user, 'Tablet')['token'];

    asToken($phone);
    $this->postJson('/api/v1/auth/logout')->assertNoContent();

    expect(PersonalAccessToken::query()->count())->toBe(1);

    asToken($phone);
    $this->getJson('/api/v1/auth/me')->assertStatus(401);
    asToken($tablet);
    $this->getJson('/api/v1/auth/me')->assertOk();
});

it('gives the same forgot-password answer for known and unknown emails', function () {
    Notification::fake();
    $user = User::factory()->create();

    $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);
    $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com']);

    $known->assertOk();
    $unknown->assertOk();
    expect($unknown->json())->toBe($known->json())
        ->and($known->json('message'))->toBe('Jika email terdaftar, tautan pemulihan akan dikirim.');
});

it('rate limits forgot-password requests', function () {
    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => "u{$attempt}@example.com"])->assertOk();
    }

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'again@example.com'])->assertStatus(429);
});

it('changes the password, keeps this device and ends every other session and token', function () {
    $user = User::factory()->create();
    $phone = apiLogin($user, 'Phone')['token'];
    apiLogin($user, 'Tablet');
    DB::table('sessions')->insert(['id' => 'web-session', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

    asToken($phone);
    $this->putJson('/api/v1/auth/password', [
        'current_password' => 'salah',
        'password' => 'sandi-baru-123',
        'password_confirmation' => 'sandi-baru-123',
    ])->assertStatus(422)->assertJsonPath('errors.current_password.0', 'Kata sandi saat ini salah.');

    expect(PersonalAccessToken::query()->count())->toBe(2);

    asToken($phone);
    $this->putJson('/api/v1/auth/password', [
        'current_password' => 'password',
        'password' => 'sandi-baru-123',
        'password_confirmation' => 'sandi-baru-123',
    ])->assertNoContent();

    expect(PersonalAccessToken::query()->count())->toBe(1)
        ->and(DB::table('sessions')->where('user_id', $user->id)->count())->toBe(0);

    asToken($phone);
    $this->getJson('/api/v1/auth/me')->assertOk();
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'sandi-baru-123', 'device_name' => 'Baru'])->assertOk();
});
