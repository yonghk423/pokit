import { readingBookEntryToShareText } from './readingBookShareText';

describe('readingBookEntryToShareText', () => {
  it('제목·저자·상태·목표·메모·알라딘 링크를 포함한다', () => {
    const text = readingBookEntryToShareText({
      id: 'b1',
      title: '해리 포터와 마법사의 돌',
      startPage: 1,
      targetPage: 50,
      status: 'reading',
      memo: '3장까지 읽기',
      aladin: {
        itemId: 1,
        link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=1',
        coverUrl: '',
        author: 'J.K. Rowling',
        totalPages: 368,
      },
    });

    expect(text).toContain('해리 포터와 마법사의 돌');
    expect(text).toContain('저자: J.K. Rowling');
    expect(text).toContain('상태: 읽는 중');
    expect(text).toContain('오늘 목표: 1P → 50P (49쪽)');
    expect(text).toContain('전체: 368쪽 · 진행 14%');
    expect(text).toContain('메모: 3장까지 읽기');
    expect(text).toContain('알라딘: https://www.aladin.co.kr');
  });

  it('메모·알라딘 정보가 없으면 해당 줄을 생략한다', () => {
    const text = readingBookEntryToShareText({
      id: 'b2',
      title: '직접 입력 도서',
      startPage: 10,
      targetPage: 30,
      status: 'want',
    });

    expect(text).toBe('직접 입력 도서\n상태: 읽고 싶은\n오늘 목표: 10P → 30P (20쪽)');
  });
});
