<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 32)->unique();
            $table->timestampTz('occurred_at');
            $table->string('description', 255);
            $table->string('category', 16)->nullable();
            $table->unsignedBigInteger('amount');
            $table->string('payment_method', 16);
            $table->foreignId('created_by')->constrained('users');
            $table->unsignedInteger('version')->default(1);
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index(['occurred_at', 'deleted_at']);
        });

        DB::statement('create sequence expense_reference_seq owned by expenses.id');

        DB::statement("alter table expenses add constraint expenses_payment_method_check check (payment_method in ('cash', 'qris', 'transfer'))");
        DB::statement("alter table expenses add constraint expenses_category_check check (category is null or category in ('supplies', 'utilities', 'rent', 'other'))");
        DB::statement('alter table expenses add constraint expenses_amount_check check (amount between 1 and 999999999)');
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
