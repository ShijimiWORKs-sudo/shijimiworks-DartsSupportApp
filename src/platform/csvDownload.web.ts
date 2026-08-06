export type CsvDownloadResult = {
  fileName: string;
};

export function sanitizeCsvFileName(fileName: string) {
  const sanitized = fileName.replace(/[:/\\?*\u0000-\u001f]/g, '_').trim();
  return sanitized.endsWith('.csv') ? sanitized : `${sanitized || 'analysis'}.csv`;
}

export function downloadCsvFile(fileName: string, csvText: string): CsvDownloadResult {
  const safeFileName = sanitizeCsvFileName(fileName);
  const text = csvText.charCodeAt(0) === 0xfeff ? csvText : `\uFEFF${csvText}`;
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = safeFileName;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  return { fileName: safeFileName };
}
