<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;

#[Signature('employee:create {name : Nama pegawai} {email : Email untuk masuk}')]
#[Description('Create an employee (pegawai) account: can record and view, but not edit, delete, or see reports and settings')]
class CreateEmployee extends Command
{
    public function handle(): int
    {
        $input = [
            'name' => $this->argument('name'),
            'email' => strtolower((string) $this->argument('email')),
            'password' => password('Kata sandi', required: true),
        ];

        $validator = Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::default()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        User::forceCreate([...$input, 'password' => bcrypt($input['password']), 'role' => 'employee']);

        $this->info('Akun pegawai dibuat.');

        return self::SUCCESS;
    }
}
