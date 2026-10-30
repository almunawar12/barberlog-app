<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->unsignedBigInteger('price');
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
        });

        DB::statement('alter table services add constraint services_price_check check (price between 0 and 999999999)');
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
