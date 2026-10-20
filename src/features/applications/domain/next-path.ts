/** Where to go after the demo sign-in. Only a path inside the same language is accepted. */
export function safeNextPath(lang: string, raw: string | undefined): string {
  const fallback = `/${lang}/applications`;
  if (!raw || !raw.startsWith(`/${lang}/`)) return fallback;
  if (/[\\\u0000-\u001f]/.test(raw)) return fallback;
  return raw;
}
