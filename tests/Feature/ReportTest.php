<?php

use App\Models\User;
use App\Queries\Reports\ReportCsv;
use App\Queries\Reports\ReportSummary;
use App\Support\JakartaPeriod;

function summaryFor(string $from, string $to): array
{
    return (new ReportSummary)->handle($from, $to);
}

describe('ReportSummary', function () {
    it('totals ten Rp25.000 sales and a Rp30.000 expense as the PRD example', function () {
        foreach (range(0, 9) as $minute) {
            seedTransaction("2026-10-30T09:0{$minute}:00+07:00", 25000);
        }
        seedExpense('2026-10-30T12:00:00+07:00', 30000);

        $summary = summaryFor('2026-10-30', '2026-10-30');

        expect($summary['total_income'])->toBe(250000)
            ->and($summary['transaction_count'])->toBe(10)
            ->and($summary['total_expense'])->toBe(30000)
            ->and($summary['net_difference'])->toBe(220000);
    });

    it('counts a multi-item transaction once and keeps breakdowns consistent with the total', function () {
        $this->actingAs(User::factory()->create());
        $haircut = makeService('Potong Rambut', 25000);
        $beard = makeService('Cukur Jenggot', 10000);

        $this->post('/transactions', transactionPayload($haircut, [
            'occurred_at' => '2026-10-30T09:00:00+07:00',
            'payment_method' => 'qris',
            'items' => [
                ['service_id' => $haircut->id, 'quantity' => 2, 'unit_price' => 25000],
                ['service_id' => $beard->id, 'quantity' => 1, 'unit_price' => 10000],
            ],
        ]));
        seedTransaction('2026-10-30T10:00:00+07:00', 25000, 'Potong Rambut', 'cash');

        $summary = summaryFor('2026-10-30', '2026-10-30');
        $byMethod = array_column($summary['income_by_payment_method'], null, 'payment_method');

        expect($summary['transaction_count'])->toBe(2)
            ->and($summary['total_income'])->toBe(85000)
            ->and($byMethod['qris']['total'])->toBe(60000)
            ->and($byMethod['cash']['total'])->toBe(25000)
            ->and($byMethod['transfer'])->toBe(['payment_method' => 'transfer', 'total' => 0, 'count' => 0])
            ->and(array_sum(array_column($summary['income_by_payment_method'], 'total')))->toBe($summary['total_income'])
            ->and(array_sum(array_column($summary['income_by_service'], 'total')))->toBe($summary['total_income']);

        // Best sellers by number of services, not by transactions.
        $names = array_column($summary['income_by_service'], 'quantity', 'service_name');
        expect($names)->toBe(['Potong Rambut' => 3, 'Cukur Jenggot' => 1]);
    });

    it('excludes soft-deleted records', function () {
        seedTransaction('2026-10-30T09:00:00+07:00', 25000)->delete();
        seedExpense('2026-10-30T09:00:00+07:00', 5000)->delete();
        seedTransaction('2026-10-30T10:00:00+07:00', 10000, 'Cukur');

        $summary = summaryFor('2026-10-30', '2026-10-30');

        expect($summary['total_income'])->toBe(10000)
            ->and($summary['transaction_count'])->toBe(1)
            ->and($summary['total_expense'])->toBe(0)
            ->and($summary['net_difference'])->toBe(10000);
    });

    it('reports a negative difference when expenses exceed income', function () {
        seedTransaction('2026-10-30T09:00:00+07:00', 10000);
        seedExpense('2026-10-30T09:00:00+07:00', 25000);

        expect(summaryFor('2026-10-30', '2026-10-30')['net_difference'])->toBe(-15000);
    });

    it('assigns records by Jakarta day at midnight and month boundaries', function () {
        seedTransaction('2026-10-30T00:05:00+07:00', 1000, 'Dini hari');      // 29 Oct in UTC
        seedTransaction('2026-10-31T23:59:59+07:00', 2000, 'Akhir Oktober');
        seedTransaction('2026-11-01T00:00:00+07:00', 4000, 'Awal November');

        expect(summaryFor('2026-10-30', '2026-10-30')['total_income'])->toBe(1000)
            ->and(summaryFor('2026-10-29', '2026-10-29')['total_income'])->toBe(0)
            ->and(summaryFor('2026-10-01', '2026-10-31')['total_income'])->toBe(3000)
            ->and(summaryFor('2026-11-01', '2026-11-30')['total_income'])->toBe(4000)
            ->and(summaryFor('2026-10-01', '2026-11-30')['total_income'])->toBe(7000);
    });

    it('is empty and zeroed when there is no data', function () {
        $summary = summaryFor('2026-10-30', '2026-10-30');

        expect($summary['total_income'])->toBe(0)
            ->and($summary['income_by_service'])->toBe([])
            ->and($summary['income_by_payment_method'])->toHaveCount(3);
    });

    it('keeps the historical name for a service renamed after the sale', function () {
        $transaction = seedTransaction('2026-10-30T09:00:00+07:00', 25000, 'Potong Rambut');
        $transaction->items->first()->service->update(['name' => 'Potong Premium']);

        expect(summaryFor('2026-10-30', '2026-10-30')['income_by_service'][0]['service_name'])->toBe('Potong Rambut');
    });
});

describe('report screen', function () {
    beforeEach(fn () => $this->actingAs(User::factory()->create()));

    it('shows today by default with Jakarta presets', function () {
        $today = JakartaPeriod::today();

        $this->get('/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('reports')
                ->where('summary.date_from', $today)
                ->where('summary.date_to', $today)
                ->where('presets.today', $today)
                ->where('presets.month_start', substr($today, 0, 8).'01'));
    });

    it('uses the requested period', function () {
        seedTransaction('2026-10-15T09:00:00+07:00', 25000);

        $this->get('/reports?date_from=2026-10-01&date_to=2026-10-31')
            ->assertInertia(fn ($page) => $page->where('summary.total_income', 25000)->where('summary.transaction_count', 1));
    });

    it('rejects an end date before the start date', function () {
        $this->from('/reports')->get('/reports?date_from=2026-10-30&date_to=2026-10-01')
            ->assertSessionHasErrors('date_to');
    });

    it('feeds the home screen with today\'s summary', function () {
        seedTransaction(now()->toIso8601String(), 25000);
        seedExpense(now()->toIso8601String(), 5000);

        $this->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('summary.total_income', 25000)
                ->where('summary.total_expense', 5000)
                ->where('summary.net_difference', 20000)
                ->where('summary.transaction_count', 1));
    });

    it('keeps guests out of reports and exports', function () {
        auth()->logout();
        $this->app['auth']->forgetGuards();

        $this->get('/reports')->assertRedirect('/login');
        $this->get('/reports/export')->assertRedirect('/login');
    });
});

describe('CSV export', function () {
    beforeEach(fn () => $this->actingAs(User::factory()->create()));

    function csvRows(string $content): array
    {
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

        return array_map('str_getcsv', array_filter(explode("\r\n", $content), fn ($line) => $line !== ''));
    }

    it('downloads UTF-8 CSV with Indonesian headings and one row per record', function () {
        $haircut = makeService('Potong Rambut', 25000);
        $beard = makeService('Cukur Jenggot', 10000);
        $this->post('/transactions', transactionPayload($haircut, [
            'occurred_at' => '2026-10-30T09:00:00+07:00',
            'payment_method' => 'qris',
            'items' => [
                ['service_id' => $haircut->id, 'quantity' => 1, 'unit_price' => 25000],
                ['service_id' => $beard->id, 'quantity' => 1, 'unit_price' => 10000],
            ],
        ]));
        seedExpense('2026-10-30T12:00:00+07:00', 15000, 'Silet', 'cash');

        $response = $this->get('/reports/export?date_from=2026-10-30&date_to=2026-10-30');

        $response->assertOk()->assertDownload('barberlog-laporan.csv');
        expect($response->headers->get('Content-Type'))->toContain('text/csv')
            ->and(str_starts_with($response->streamedContent(), "\xEF\xBB\xBF"))->toBeTrue();

        $rows = csvRows($response->streamedContent());
        expect($rows[0])->toBe(['Tanggal', 'Jenis', 'Nomor referensi', 'Keterangan', 'Metode pembayaran', 'Pemasukan', 'Pengeluaran'])
            ->and($rows)->toHaveCount(3)
            ->and($rows[1][0])->toBe('2026-10-30 09:00')
            ->and(array_slice($rows[1], 1, 1))->toBe(['Pemasukan'])
            ->and($rows[1][3])->toBe('Potong Rambut, Cukur Jenggot')
            ->and($rows[1][4])->toBe('QRIS')
            ->and(array_slice($rows[1], 5))->toBe(['35000', ''])
            ->and($rows[2][1])->toBe('Pengeluaran')
            ->and($rows[2][4])->toBe('Tunai')
            ->and(array_slice($rows[2], 5))->toBe(['', '15000']);
    });

    it('matches the report totals for the same filter', function () {
        seedTransaction('2026-10-30T09:00:00+07:00', 25000);
        seedTransaction('2026-10-30T10:00:00+07:00', 10000, 'Cukur');
        seedExpense('2026-10-30T11:00:00+07:00', 7000);

        $rows = csvRows($this->get('/reports/export?date_from=2026-10-30&date_to=2026-10-30')->streamedContent());
        array_shift($rows);
        $summary = summaryFor('2026-10-30', '2026-10-30');

        expect(array_sum(array_map('intval', array_column($rows, 5))))->toBe($summary['total_income'])
            ->and(array_sum(array_map('intval', array_column($rows, 6))))->toBe($summary['total_expense']);
    });

    it('honours the date and type filters and skips deleted records', function () {
        seedTransaction('2026-10-29T09:00:00+07:00', 1000, 'Kemarin');
        seedTransaction('2026-10-30T09:00:00+07:00', 2000, 'Hari ini');
        seedTransaction('2026-10-30T09:30:00+07:00', 3000, 'Dihapus')->delete();
        seedExpense('2026-10-30T10:00:00+07:00', 4000);

        $incomeOnly = csvRows($this->get('/reports/export?date_from=2026-10-30&date_to=2026-10-30&type=transaction')->streamedContent());

        expect($incomeOnly)->toHaveCount(2)->and($incomeOnly[1][3])->toBe('Hari ini');
    });

    it('lists rows oldest first', function () {
        seedTransaction('2026-10-30T11:00:00+07:00', 1000, 'Siang');
        seedTransaction('2026-10-30T08:00:00+07:00', 2000, 'Pagi');

        $rows = csvRows($this->get('/reports/export?date_from=2026-10-30&date_to=2026-10-30')->streamedContent());

        expect([$rows[1][3], $rows[2][3]])->toBe(['Pagi', 'Siang']);
    });

    it('neutralises spreadsheet formulas in user text', function (string $text, string $expected) {
        seedExpense('2026-10-30T10:00:00+07:00', 1000, $text);

        $rows = csvRows($this->get('/reports/export?date_from=2026-10-30&date_to=2026-10-30')->streamedContent());

        expect($rows[1][3])->toBe($expected);
    })->with([
        'equals' => ['=HYPERLINK("http://evil","x")', '\'=HYPERLINK("http://evil","x")'],
        'plus' => ['+1+1', "'+1+1"],
        'minus' => ['-2+3', "'-2+3"],
        'at' => ['@SUM(A1)', "'@SUM(A1)"],
        'plain' => ['Beli silet', 'Beli silet'],
        'comma and quote survive' => ['Silet, "tajam"', 'Silet, "tajam"'],
    ]);

    it('keeps formula protection in one place', function () {
        expect(ReportCsv::safeText("\tcmd"))->toBe("'\tcmd");
    });
});
