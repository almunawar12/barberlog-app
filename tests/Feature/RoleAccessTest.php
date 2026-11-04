<?php

use App\Models\User;

it('lets an employee record and view but not edit, delete, report or change shop settings', function () {
    $this->actingAs(User::factory()->employee()->create());

    $this->get('/dashboard')->assertOk();
    $this->get('/history')->assertOk();
    $this->get('/transactions/create')->assertOk();
    $this->get('/expenses/create')->assertOk();

    $this->get('/reports')->assertForbidden();
    $this->get('/reports/export')->assertForbidden();
    $this->put('/settings', ['name' => 'X'])->assertForbidden();
    $this->post('/services', ['name' => 'X', 'price' => 1000])->assertForbidden();
    $this->get('/transactions/1/edit')->assertForbidden();
    $this->delete('/transactions/1')->assertForbidden();
    $this->delete('/expenses/1')->assertForbidden();
});

it('hides shop and service data from an employee on the settings page', function () {
    $this->actingAs(User::factory()->employee()->create());

    $this->get('/settings')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('shop', null)->where('services', []));
});

it('lets an admin reach every menu', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/reports')->assertOk();
    $this->get('/settings')->assertOk();
});

it('blocks an employee from admin API endpoints and exposes the role', function () {
    $employee = User::factory()->employee()->create();
    $this->actingAs($employee, 'sanctum');

    $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.role', 'employee');
    $this->getJson('/api/v1/services')->assertOk();
    $this->getJson('/api/v1/history')->assertOk();

    $this->getJson('/api/v1/reports/summary')->assertForbidden();
    $this->getJson('/api/v1/settings')->assertForbidden();
    $this->putJson('/api/v1/transactions/1', [])->assertForbidden();
    $this->deleteJson('/api/v1/expenses/1', [])->assertForbidden();
});
