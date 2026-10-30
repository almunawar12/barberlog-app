<?php

namespace App\Queries\Reports;

use App\Queries\History\ListHistory;
use Carbon\CarbonImmutable;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportCsv
{
    private const PAYMENT_LABELS = ['cash' => 'Tunai', 'qris' => 'QRIS', 'transfer' => 'Transfer'];

    public function __construct(private ListHistory $history) {}

    /**
     * One row per transaction or expense (never one per item), oldest first.
     *
     * @param  array{date_from?: string|null, date_to?: string|null, type?: string|null}  $filters
     */
    public function response(array $filters): StreamedResponse
    {
        $rows = $this->history->all($filters)->reverse()->values();

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                return;
            }

            // Byte order mark so Excel opens the file as UTF-8.
            fwrite($out, "\xEF\xBB\xBF");
            $this->write($out, ['Tanggal', 'Jenis', 'Nomor referensi', 'Keterangan', 'Metode pembayaran', 'Pemasukan', 'Pengeluaran']);

            foreach ($rows as $row) {
                $isExpense = $row['type'] === 'expense';
                $this->write($out, [
                    CarbonImmutable::parse($row['occurred_at'])->setTimezone('Asia/Jakarta')->format('Y-m-d H:i'),
                    $isExpense ? 'Pengeluaran' : 'Pemasukan',
                    $row['reference'],
                    self::safeText($row['summary']),
                    self::PAYMENT_LABELS[$row['payment_method']] ?? $row['payment_method'],
                    $isExpense ? '' : $row['amount'],
                    $isExpense ? $row['amount'] : '',
                ]);
            }

            fclose($out);
        }, 'barberlog-laporan.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Stops spreadsheets from evaluating user text as a formula.
     */
    public static function safeText(string $value): string
    {
        return preg_match('/^[=+\-@\t\r]/', $value) === 1 ? "'".$value : $value;
    }

    /**
     * @param  resource  $out
     * @param  list<string|int>  $fields
     */
    private function write($out, array $fields): void
    {
        // Empty escape character: PHP's default backslash escaping is deprecated and corrupts values ending in a backslash.
        fputcsv($out, $fields, ',', '"', '', "\r\n");
    }
}
