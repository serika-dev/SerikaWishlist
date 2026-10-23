/** Keep cross-product login/signup return links on this site. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4000 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return '/';
  return value;
}
