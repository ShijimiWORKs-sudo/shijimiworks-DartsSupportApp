export type CsvDownloadResult = {
  fileName: string;
};

export function sanitizeCsvFileName(fileName: string) {
  const sanitized = fileName.replace(/[:/\\?*\u0000-\u001f]/g, '_').trim();
  return sanitized.endsWith('.csv') ? sanitized : `${sanitized || 'analysis'}.csv`;
}

export function downloadCsvFile(fileName: string, _csvText: string): CsvDownloadResult {
  throw new Error(`${sanitizeCsvFileName(fileName)}のCSVダウンロードはPC Web版で利用できます。`);
}
