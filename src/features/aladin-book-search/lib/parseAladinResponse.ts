export async function parseAladinResponse<T>(response: Response): Promise<T> {
  const text = (await response.text()).trim();
  if (text.length === 0) {
    throw new Error('empty response');
  }

  if (text.startsWith('callback(')) {
    const inner = text.slice('callback('.length);
    const jsonText = inner.endsWith(');')
      ? inner.slice(0, -2)
      : inner.endsWith(')')
        ? inner.slice(0, -1)
        : inner;
    return JSON.parse(jsonText) as T;
  }

  return JSON.parse(text) as T;
}

/** 알라딘 API title 필드에 포함될 수 있는 HTML 태그 제거 */
export function stripAladinHtml(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/<[^>]+>/g, '').trim();
}
