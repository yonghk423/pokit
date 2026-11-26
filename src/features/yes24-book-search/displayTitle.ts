type DisplayBookTitle = { title: string; editionLabel?: string };

const hangul = /[ㄱ-ㆎ가-힣]/;
const labels = {
  uk: /영국판/,
  us: /미국판/,
  japan: /일본도서|일본어판|일본판/,
  taiwan: /대만도서|대만판|번체자|번체판/,
};

const editionMarker = /\[\s*(?:영국판|미국판|일본도서|일본어판|일본판|대만도서|대만판|번체자|번체판)\s*\]|\(\s*(?:영국판|미국판|일본도서|일본어판|일본판|대만도서|대만판|번체자|번체판)\s*\)/g;

export function getYes24DisplayTitle(original: string, locale: string): DisplayBookTitle {
  if (locale !== 'en' && locale !== 'ja' && locale !== 'zh-TW') {
    return { title: original };
  }

  const cleaned = original.replace(editionMarker, ' ').replace(/\s+/g, ' ').trim();
  // Only remove a Korean lead-in when the foreign title is present in the source.
  const title = locale === 'en'
    ? cleaned.replace(/\s*[:：]\s*[가-힣].*$/, '').trim()
    : cleaned.replace(/^(?:[가-힣]+\s+)+(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/u, '');
  const hasLocalizedTitle = locale === 'en'
    ? /[a-z]{2}/i.test(title) && !hangul.test(title)
    : locale === 'ja'
      ? /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(title) ||
        (labels.japan.test(original) && /\p{Script=Han}/u.test(title))
      : !hangul.test(title) && /\p{Script=Han}/u.test(title) && !/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(title);

  if (!title || !hasLocalizedTitle) return { title: original };
  const editionLabel = locale === 'en'
    ? labels.uk.test(original) ? 'UK Edition' : labels.us.test(original) ? 'US Edition' : undefined
    : locale === 'ja'
      ? labels.japan.test(original) ? '日本語版' : undefined
      : /대만도서|대만판/.test(original) ? '臺灣版' : labels.taiwan.test(original) ? '繁體版' : undefined;
  return { title, editionLabel };
}
