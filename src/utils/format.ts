export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US");
}

export function formatKey(key: string, keyMap: Record<string, string>): string {
  const resolved = key && !isNaN(Date.parse(key)) ? formatDate(key) : key;
  return keyMap[resolved] ?? resolved;
}
