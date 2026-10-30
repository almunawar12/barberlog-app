<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 32)->unique();
            $table->timestampTz('occurred_at');
            $table->string('payment_method', 16);
            $table->unsignedBigInteger('total_amount');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->unsignedInteger('version')->default(1);
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index(['occurred_at', 'deleted_at']);
        });

        // Owned by the table so it is dropped with it (migrate:fresh leaves loose sequences behind).
        DB::statement('create sequence transaction_reference_seq owned by transactions.id');

        DB::statement("alter table transactions add constraint transactions_payment_method_check check (payment_method in ('cash', 'qris', 'transfer'))");
        DB::statement('alter table transactions add constraint transactions_total_amount_check check (total_amount between 1 and 999999999)');

        Schema::create('transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services');
            $table->string('service_name_snapshot', 100);
            $table->unsignedBigInteger('unit_price');
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('line_total');
            $table->timestampsTz();

            $table->index('transaction_id');
        });

        DB::statement('alter table transaction_items add constraint transaction_items_unit_price_check check (unit_price between 0 and 999999999)');
        DB::statement('alter table transaction_items add constraint transaction_items_quantity_check check (quantity >= 1)');
        DB::statement('alter table transaction_items add constraint transaction_items_line_total_check check (line_total between 0 and 999999999)');
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_items');
        Schema::dropIfExists('transactions');
    }
};
