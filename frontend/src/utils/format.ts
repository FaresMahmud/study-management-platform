export function pluralize(count: number, singular: string, plural?: string): string {
  const p = plural || `${singular}s`;
  return count === 1 ? `${count} ${singular}` : `${count} ${p}`;
}
