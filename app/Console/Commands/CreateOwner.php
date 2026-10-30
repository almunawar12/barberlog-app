<?php

namespace App\Console\Commands;

use App\Models\ShopSetting;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;

#[Signature('owner:create {name : Nama pemilik} {email : Email untuk masuk}')]
#[Description('Create the single owner account (there is no public registration)')]
class CreateOwner extends Command
{
    public function handle(): int
    {
        if (User::query()->exists()) {
            $this->error('Akun pemilik sudah ada. Gunakan owner:reset-password untuk memulihkan akses.');

            return self::FAILURE;
        }

        $input = [
            'name' => $this->argument('name'),
            'email' => strtolower((string) $this->argument('email')),
            'password' => password('Kata sandi', required: true),
        ];

        $validator = Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', Password::default()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        DB::transaction(function () use ($input): void {
            User::create($input);
            ShopSetting::current();
        });

        $this->info('Akun pemilik dibuat.');

        return self::SUCCESS;
    }
}
