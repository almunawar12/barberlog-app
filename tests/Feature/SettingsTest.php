<?php

use App\Models\Service;
use App\Models\ShopSetting;
use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

it('shows shop settings and services', function () {
    Service::create(['name' => 'Potong Rambut', 'price' => 25000]);

    $this->get('/settings')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings')
            ->where('shop.name', config('app.name'))
            ->has('services', 1)
            ->where('services.0.price', 25000));
});

it('updates the shop name and default service', function () {
    $service = Service::create(['name' => 'Potong Rambut', 'price' => 25000]);

    $this->put('/settings', ['name' => 'Barber Jaya', 'default_service_id' => $service->id])
        ->assertSessionHasNoErrors();

    $shop = ShopSetting::current();
    expect($shop->name)->toBe('Barber Jaya')->and($shop->default_service_id)->toBe($service->id);
});

it('rejects an inactive service as default', function () {
    $service = Service::create(['name' => 'Lama', 'price' => 10000, 'is_active' => false]);

    $this->put('/settings', ['name' => 'Barber Jaya', 'default_service_id' => $service->id])
        ->assertSessionHasErrors('default_service_id');
});

it('creates a service with integer rupiah price', function () {
    $this->post('/services', ['name' => 'Cukur Jenggot', 'price' => 10000])
        ->assertSessionHasNoErrors();

    expect(Service::query()->where('name', 'Cukur Jenggot')->value('price'))->toBe(10000);
});

it('validates service input with Indonesian messages', function () {
    $this->post('/services', ['name' => 'Cukur'])
        ->assertSessionHasErrors(['price' => 'Harga wajib diisi.']);

    $this->post('/services', ['name' => 'Cukur', 'price' => 1000000000])
        ->assertSessionHasErrors('price');

    $this->post('/services', ['name' => 'Cukur', 'price' => 12.5])
        ->assertSessionHasErrors(['price' => 'Harga harus berupa bilangan bulat.']);

    $this->post('/services', ['name' => 'Cukur', 'price' => -1])
        ->assertSessionHasErrors('price');
});

it('clears the default when the default service is deactivated', function () {
    $service = Service::create(['name' => 'Potong Rambut', 'price' => 25000]);
    ShopSetting::current()->update(['default_service_id' => $service->id]);

    $this->put("/services/{$service->id}", ['name' => 'Potong Rambut', 'price' => 25000, 'is_active' => false])
        ->assertSessionHasNoErrors();

    expect($service->fresh()->is_active)->toBeFalse()
        ->and(ShopSetting::current()->default_service_id)->toBeNull();
});
