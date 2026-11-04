<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;

#[Signature('owner:reset-password')]
#[Description('Set a new password for the owner and revoke all web sessions and mobile tokens')]
class ResetOwnerPassword extends Command
{
    public function handle(): int
    {
        $owner = User::query()->where('role', 'admin')->oldest('id')->first();

        if ($owner === null) {
            $this->error('Belum ada akun pemilik. Jalankan owner:create.');

            return self::FAILURE;
        }

        $newPassword = password('Kata sandi baru', required: true);

        $validator = Validator::make(
            ['password' => $newPassword],
            ['password' => ['required', 'string', Password::default()]],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $owner->forceFill(['password' => $newPassword])->save();
        $owner->revokeOtherAccess();

        $this->info('Kata sandi diubah. Semua sesi dan token lama dicabut.');

        return self::SUCCESS;
    }
}
