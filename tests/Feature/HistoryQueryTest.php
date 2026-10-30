<?php

use App\Models\Expense;
use App\Models\Transaction;
use App\Models\User;
use App\Queries\History\ListHistory;
use App\Support\JakartaPeriod;
use Carbon\CarbonImmutable;

function seedTransaction(string $occurredAt, int $total = 25000, ?string $name = 'Potong Rambut'): Transaction
{
    $service = makeService($name ?? 'Layanan', $total);
    $transaction = Transaction::forceCreate([
        'reference' => Transaction::nextReference(),
        'occurred_at' => CarbonImmutable::parse($occurredAt)->utc(),
        'payment_method' => 'cash',
        'total_amount' => $total,
        'created_by' => User::query()->first()?->id ?? User::factory()->create()->id,
        'version' => 1,
    ]);
    $transaction->items()->create([
        'service_id' => $service->id,
        'service_name_snapshot' => $service->name,
        'unit_price' => $total,
        'quantity' => 1,
        'line_total' => $total,
    ]);

    return $transaction;
}

function seedExpense(string $occurredAt, int $amount = 15000): Expense
{
    return Expense::forceCreate([
        'reference' => Expense::nextReference(),
        'occurred_at' => CarbonImmutable::parse($occurredAt)->utc(),
        'description' => 'Silet',
        'amount' => $amount,
        'payment_method' => 'cash',
        'created_by' => User::query()->first()?->id ?? User::factory()->create()->id,
        'version' => 1,
    ]);
}

describe('JakartaPeriod', function () {
    it('maps Jakarta calendar dates to UTC bounds with an exclusive end', function () {
        [$start, $end] = JakartaPeriod::bounds('2026-10-01', '2026-10-31');

        expect($start->toIso8601String())->toBe('2026-09-30T17:00:00+00:00')
            ->and($end->toIso8601String())->toBe('2026-10-31T17:00:00+00:00');
    });

    it('leaves a side open when a date is missing', function () {
        expect(JakartaPeriod::bounds(null, null))->toBe([null, null]);
    });
});

describe('ListHistory', function () {
    it('lists transactions and expenses together, newest first, with summaries', function () {
        seedTransaction('2026-10-30T09:00:00+07:00', 25000, 'Potong Rambut');
        seedExpense('2026-10-30T10:00:00+07:00');
        seedTransaction('2026-10-30T08:00:00+07:00', 10000, 'Cukur Jenggot');

        $rows = (new ListHistory)->paginate([])->items();

        expect(array_column($rows, 'type'))->toBe(['expense', 'transaction', 'transaction'])
            ->and(array_column($rows, 'summary'))->toBe(['Silet', 'Potong Rambut', 'Cukur Jenggot'])
            ->and($rows[1]['occurred_at'])->toBe('2026-10-30T02:00:00+00:00');
    });

    it('excludes soft-deleted records', function () {
        seedTransaction('2026-10-30T09:00:00+07:00')->delete();
        seedExpense('2026-10-30T09:00:00+07:00')->delete();
        seedExpense('2026-10-30T09:30:00+07:00');

        expect((new ListHistory)->paginate([])->total())->toBe(1);
    });

    it('filters by type', function () {
        seedTransaction('2026-10-30T09:00:00+07:00');
        seedExpense('2026-10-30T09:00:00+07:00');

        expect((new ListHistory)->paginate(['type' => 'expense'])->items())->toHaveCount(1)
            ->and((new ListHistory)->paginate(['type' => 'transaction'])->items()[0]['type'])->toBe('transaction');
    });

    it('puts 00:05 WIB on the Jakarta day even though UTC is still the day before', function () {
        seedTransaction('2026-10-30T00:05:00+07:00');

        expect((new ListHistory)->paginate(['date_from' => '2026-10-30', 'date_to' => '2026-10-30'])->total())->toBe(1)
            ->and((new ListHistory)->paginate(['date_from' => '2026-10-29', 'date_to' => '2026-10-29'])->total())->toBe(0);
    });

    it('neither loses nor duplicates records at the month boundary', function () {
        seedTransaction('2026-10-31T23:59:59+07:00', 1000, 'Last of October');
        seedTransaction('2026-11-01T00:00:00+07:00', 2000, 'First of November');

        $october = (new ListHistory)->paginate(['date_from' => '2026-10-01', 'date_to' => '2026-10-31'])->items();
        $november = (new ListHistory)->paginate(['date_from' => '2026-11-01', 'date_to' => '2026-11-30'])->items();

        expect(array_column($october, 'summary'))->toBe(['Last of October'])
            ->and(array_column($november, 'summary'))->toBe(['First of November']);
    });

    it('returns only the latest records for the home screen', function () {
        foreach (range(1, 7) as $day) {
            seedExpense("2026-10-0{$day}T09:00:00+07:00");
        }

        $recent = (new ListHistory)->recent(5);

        expect($recent)->toHaveCount(5)->and($recent->first()['occurred_at'])->toBe('2026-10-07T02:00:00+00:00');
    });
});
