<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('operation', 32);
            $table->uuid('key');
            $table->string('request_hash', 64);
            $table->string('resource_type', 32);
            $table->unsignedBigInteger('resource_id');
            $table->timestampTz('created_at')->useCurrent();

            $table->unique(['user_id', 'operation', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_requests');
    }
};
