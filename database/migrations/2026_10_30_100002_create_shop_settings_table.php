<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('id')->primary();
            $table->string('name', 100);
            $table->string('timezone', 64)->default('Asia/Jakarta');
            $table->string('currency', 3)->default('IDR');
            $table->foreignId('default_service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->timestampsTz();
        });

        // Singleton: exactly one shop row.
        DB::statement('alter table shop_settings add constraint shop_settings_singleton_check check (id = 1)');
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_settings');
    }
};
