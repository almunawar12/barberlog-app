import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { apiUrl, authHeaders } from '@/lib/api-client';
import { id } from '@/locales/id';

export class ExportUnavailableError extends Error {
  constructor() {
    super(id.reports.shareUnavailable);
    this.name = 'ExportUnavailableError';
  }
}

/**
 * Downloads the CSV with the owner's token and opens the share sheet. The file is saved as
 * received, so the UTF-8 byte order mark that lets Excel read it is preserved.
 */
export async function exportReportCsv(dateFrom: string, dateTo: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new ExportUnavailableError();
  }

  const destination = new File(Paths.cache, 'barberlog-laporan.csv');
  const file = await File.downloadFileAsync(apiUrl('/reports/export', { date_from: dateFrom, date_to: dateTo }), destination, {
    headers: { ...(await authHeaders()), Accept: 'text/csv' },
    idempotent: true,
  });

  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: id.reports.shareTitle });
}
