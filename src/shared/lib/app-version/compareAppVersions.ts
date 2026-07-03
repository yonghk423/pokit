function parseVersionParts(version: string): number[] {
  return version
    .split('.')
    .map((part) => {
      const match = /^(\d+)/.exec(part.trim());
      return match ? Number(match[1]) : 0;
    });
}

/** 시맨틱 버전 비교. `a`가 더 크면 1, 같으면 0, 작으면 -1 */
export function compareAppVersions(a: string, b: string): -1 | 0 | 1 {
  const left = parseVersionParts(a);
  const right = parseVersionParts(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }

  return 0;
}
