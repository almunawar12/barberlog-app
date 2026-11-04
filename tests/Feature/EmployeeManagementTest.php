<?php

use App\Models\AuditLog;
use App\Models\User;

it('creates an employee with the employee role and audits it', function () {
    $admin = User::factory()->create();
    $this->actingAs($admin);

    $this->post('/employees', [
        'name' => 'Budi',
        'email' => 'Budi@Example.com',
        'password' => 'Sandi-kuat-123!',
    ])->assertSessionHasNoErrors();

    $employee = User::where('email', 'budi@example.com')->firstOrFail();
    expect($employee->role)->toBe('employee')->and($employee->isActive())->toBeTrue();

    $log = AuditLog::where('entity_type', 'user')->firstOrFail();
    expect($log->user_id)->toBe($admin->id)
        ->and($log->after_json)->not->toHaveKey('password');
});

it('rejects a duplicate email', function () {
    $admin = User::factory()->create();
    $this->actingAs($admin)
        ->post('/employees', ['name' => 'X', 'email' => $admin->email, 'password' => 'Sandi-kuat-123!'])
        ->assertSessionHasErrors('email');
});

it('keeps the password when left blank and revokes access when it changes', function () {
    $this->actingAs(User::factory()->create());
    $employee = User::factory()->employee()->create();
    $oldHash = $employee->password;
    $employee->createToken('phone');

    $this->put("/employees/{$employee->id}", ['name' => 'Baru', 'email' => $employee->email, 'password' => ''])
        ->assertSessionHasNoErrors();
    expect($employee->fresh()->password)->toBe($oldHash)->and($employee->tokens()->count())->toBe(1);

    $this->put("/employees/{$employee->id}", ['name' => 'Baru', 'email' => $employee->email, 'password' => 'Sandi-kuat-456!'])
        ->assertSessionHasNoErrors();
    expect($employee->fresh()->password)->not->toBe($oldHash)->and($employee->tokens()->count())->toBe(0);
});

it('deactivates an employee, revokes tokens and blocks web and API login', function () {
    $this->actingAs(User::factory()->create());
    $employee = User::factory()->employee()->create(['email' => 'pegawai@example.com']);
    $employee->createToken('phone');

    $this->put("/employees/{$employee->id}", ['name' => $employee->name, 'email' => $employee->email, 'is_active' => false])
        ->assertSessionHasNoErrors();

    expect($employee->fresh()->isActive())->toBeFalse()->and($employee->tokens()->count())->toBe(0);

    auth()->logout();
    $this->post('/login', ['email' => 'pegawai@example.com', 'password' => 'password'])->assertSessionHasErrors();
    $this->assertGuest();

    $this->postJson('/api/v1/auth/login', ['email' => 'pegawai@example.com', 'password' => 'password', 'device_name' => 'hp'])
        ->assertUnprocessable();
});

it('cannot edit an admin account through the employee screen', function () {
    $admin = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($admin)
        ->put("/employees/{$other->id}", ['name' => 'X', 'email' => $other->email])
        ->assertNotFound();
});

it('lets only admins use employee management and the activity log', function () {
    $this->actingAs(User::factory()->employee()->create());

    $this->get('/employees')->assertForbidden();
    $this->post('/employees', [])->assertForbidden();
    $this->put('/employees/1', [])->assertForbidden();
    $this->get('/activity-logs')->assertForbidden();
});

it('lists activity newest first with the acting user', function () {
    $admin = User::factory()->create();
    AuditLog::record($admin, 'expense', 1, 'create', null, ['reference' => 'EXP-1', 'amount' => 5000]);
    AuditLog::record($admin, 'transaction', 2, 'delete', ['reference' => 'TRX-2', 'total_amount' => 25000], null);

    $this->actingAs($admin)->get('/activity-logs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('activity-logs')
            ->has('logs.data', 2)
            ->where('logs.data.0.action', 'delete')
            ->where('logs.data.0.label', 'TRX-2')
            ->where('logs.data.0.amount', 25000)
            ->where('logs.data.0.user_name', $admin->name));
});

it('lists only employees and serves the create and edit pages', function () {
    $this->actingAs(User::factory()->create());
    $employee = User::factory()->employee()->create();

    $this->get('/employees')->assertOk()->assertInertia(fn ($page) => $page
        ->component('employees/index')
        ->has('employees', 1)
        ->where('employees.0.id', $employee->id));

    $this->get('/employees/create')->assertOk()->assertInertia(fn ($page) => $page->component('employees/create'));
    $this->get("/employees/{$employee->id}/edit")->assertOk()
        ->assertInertia(fn ($page) => $page->component('employees/edit')->where('employee.email', $employee->email));
});

it('does not open an admin account in the employee edit page', function () {
    $admin = User::factory()->create();

    $this->actingAs($admin)->get("/employees/{$admin->id}/edit")->assertNotFound();
});

it('redirects to the list after saving', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/employees', ['name' => 'Sari', 'email' => 'sari@example.com', 'password' => 'Sandi-kuat-123!'])
        ->assertRedirect('/employees');
});

it('logs web and mobile sign-ins in the activity log', function () {
    $user = User::factory()->employee()->create(['email' => 'pegawai@example.com']);

    $this->post('/login', ['email' => 'pegawai@example.com', 'password' => 'password']);
    $this->postJson('/api/v1/auth/login', ['email' => 'pegawai@example.com', 'password' => 'password', 'device_name' => 'hp'])
        ->assertOk();

    $channels = AuditLog::where('action', 'login')->where('user_id', $user->id)->orderBy('id')->pluck('after_json')->pluck('channel');
    expect($channels->all())->toBe(['web', 'mobile']);
});

it('does not log a failed sign-in', function () {
    User::factory()->create(['email' => 'a@example.com']);

    $this->post('/login', ['email' => 'a@example.com', 'password' => 'salah']);

    expect(AuditLog::where('action', 'login')->count())->toBe(0);
});
