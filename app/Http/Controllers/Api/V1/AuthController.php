<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const TOKEN_LIFETIME_DAYS = 30;

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:100'],
        ]);

        $provider = Auth::createUserProvider('users');
        $user = $provider->retrieveByCredentials(['email' => Str::lower($data['email'])]);

        /** @var User|null $user */
        if ($user === null || ! $user->isActive() || ! $provider->validateCredentials($user, ['password' => $data['password']])) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        $token = DB::transaction(function () use ($user, $data) {
            $token = $user->createToken($data['device_name'], ['*'], now()->addDays(self::TOKEN_LIFETIME_DAYS));
            AuditLog::record($user, 'user', $user->id, 'login', null, ['channel' => 'mobile']);

            return $token;
        });

        return response()->json(['data' => [
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
            'user' => $this->userData($user),
        ]]);
    }

    public function logout(Request $request): Response
    {
        // Bearer tokens only (Sanctum SPA cookies are off), so the current token is always a PersonalAccessToken.
        $request->user()?->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $this->userData($user)]);
    }

    /**
     * Always answers the same way so the endpoint cannot be used to find out which emails exist.
     * The emailed link opens the web reset page.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink(['email' => Str::lower($data['email'])]);

        return response()->json(['message' => __('passwords.sent')]);
    }

    public function updatePassword(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'password' => ['required', 'string', PasswordRule::default(), 'confirmed'],
        ]);

        $user->forceFill(['password' => Hash::make($data['password'])])->save();

        // Ends every other device: web sessions and all other mobile tokens.
        $user->revokeOtherAccess(keepTokenId: (int) $user->currentAccessToken()->id);

        return response()->noContent();
    }

    /**
     * @return array{id: int, name: string, email: string, role: string}
     */
    private function userData(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role];
    }
}
