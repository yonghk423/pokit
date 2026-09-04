import type { AppLocale } from '@shared/lib/i18n/model/locale';

/**
 * 동기부여 명언의 뜻을 유지하되, 사용자에게 말을 거는 어조로 다듬은 카피.
 * author는 원 인용 출처 표기용.
 */
export type DailyQuoteEntry = {
  id: string;
  author: string;
  en: string;
  ko: string;
  ja: string;
};

export const DAILY_QUOTES: readonly DailyQuoteEntry[] = [
  {
    id: 'confucius-1',
    author: 'Confucius',
    en: 'Go as slowly as you need — just don’t stop today.',
    ko: '오늘 천천히 가도 괜찮아요. 멈추지만 않으면 돼요.',
    ja: '今日はゆっくりで大丈夫。止まらなければそれでいい。',
  },
  {
    id: 'lao-tzu-1',
    author: 'Lao Tzu',
    en: 'That long path ahead? It starts with the step you take now.',
    ko: '먼 길도 괜찮아요. 지금 한 걸음이면 시작이에요.',
    ja: '遠い道でも大丈夫。今の一歩がスタートだよ。',
  },
  {
    id: 'aristotle-1',
    author: 'Aristotle',
    en: 'You’re shaped by what you repeat. Today’s small habit is who you’re becoming.',
    ko: '반복하는 일이 곧 당신이에요. 오늘의 작은 습관이 내일의 당신을 만들어요.',
    ja: '繰り返すことが、そのままあなたになる。今日の小さな習慣が明日の自分をつくるよ。',
  },
  {
    id: 'twain-1',
    author: 'Mark Twain',
    en: 'Want to get ahead? Start first — even a tiny start counts.',
    ko: '앞서가고 싶다면, 일단 시작해요. 아주 작아도 괜찮아요.',
    ja: '先に進みたいなら、まずは始めよう。小さくて大丈夫。',
  },
  {
    id: 'thoreau-1',
    author: 'Henry David Thoreau',
    en: 'Walk toward what you imagined — with a little more confidence today.',
    ko: '그려 둔 삶을 향해, 오늘만 조금 더 자신 있게 걸어가요.',
    ja: '思い描いた人生に向かって、今日は少し自信を持って歩こう。',
  },
  {
    id: 'churchill-1',
    author: 'Winston Churchill',
    en: 'A win isn’t the end, and a miss isn’t the end either. What matters is that you keep going.',
    ko: '잘했다고 끝이 아니고, 실패했다고 끝난 것도 아니에요. 계속하는 마음이 중요해요.',
    ja: 'うまくいったら終わり、じゃなくて失敗でも終わりじゃない。続ける気持ちが大事だよ。',
  },
  {
    id: 'roosevelt-1',
    author: 'Theodore Roosevelt',
    en: 'Right here, with what you have — do the part you can do today.',
    ko: '지금 있는 곳에서, 가진 걸로, 오늘 할 수 있는 것만 해봐요.',
    ja: '今いる場所で、持っているもので、今日できることだけやってみよう。',
  },
  {
    id: 'eleanor-1',
    author: 'Eleanor Roosevelt',
    en: 'A new day is here — bring a little new strength with you.',
    ko: '새 날이 왔어요. 오늘도 새 힘을 조금만 더 가져와요.',
    ja: '新しい日が来たよ。今日も少し新しい力を持っていこう。',
  },
  {
    id: 'mandela-1',
    author: 'Nelson Mandela',
    en: 'It feels impossible until you finish it — so take the next small step.',
    ko: '해내기 전엔 늘 불가능해 보여요. 그러니 다음 작은 한 걸음만 가요.',
    ja: 'やり遂げる前は、いつも無理に見える。だから次の小さな一歩だけ進もう。',
  },
  {
    id: 'gandhi-1',
    author: 'Mahatma Gandhi',
    en: 'Your tomorrow is built by what you choose to do today.',
    ko: '내일은 오늘 당신이 선택한 일로 만들어져요.',
    ja: '明日は、今日あなたが選ぶ行動でつくられるよ。',
  },
  {
    id: 'king-1',
    author: 'Martin Luther King Jr.',
    en: 'If you can’t run, walk. If you can’t walk, crawl — just keep moving forward.',
    ko: '뛸 수 없으면 걸어도 돼요. 걸을 수 없으면 기어서라도, 앞으로만 가요.',
    ja: '走れなければ歩いていい。歩けなければ這ってもいい。とにかく前へ進もう。',
  },
  {
    id: 'jobs-1',
    author: 'Steve Jobs',
    en: 'Great work grows where you care — stick with what you love doing.',
    ko: '사랑하는 일에서 좋은 결과가 자라요. 오늘도 그 마음을 지켜봐요.',
    ja: '好きなことから良い仕事は育つ。今日もその気持ちを大切にしよう。',
  },
  {
    id: 'franklin-1',
    author: 'Benjamin Franklin',
    en: 'Saying it well is nice — doing it well today is better.',
    ko: '잘 말하는 것보다, 오늘 잘 하는 쪽이 더 나아요.',
    ja: '上手に言うより、今日ちゃんとやるほうがいいよ。',
  },
  {
    id: 'lincoln-1',
    author: 'Abraham Lincoln',
    en: 'Don’t wait to guess the future — build a piece of it today.',
    ko: '미래를 맞히려고만 하지 말아요. 오늘 일부를 직접 만들어 봐요.',
    ja: '未来を当てようとしないで。今日、その一部を自分でつくってみよう。',
  },
  {
    id: 'plato-1',
    author: 'Plato',
    en: 'The hardest part is starting — once you begin, you’re already ahead.',
    ko: '제일 어려운 건 시작이에요. 시작하면 이미 한 걸음 앞선 거예요.',
    ja: 'いちばん難しいのは始めること。始めれば、もう一歩先にいるよ。',
  },
  {
    id: 'aurelius-2',
    author: 'Marcus Aurelius',
    en: 'Skip the debate about who you should be — just show up as that person today.',
    ko: '어떤 사람이 되어야 할지 고민만 하지 말아요. 오늘 그 사람으로 나타나 봐요.',
    ja: 'どんな人になるべきか考えすぎないで。今日、その人として現れてみよう。',
  },
  {
    id: 'seneca-2',
    author: 'Seneca',
    en: 'Time isn’t too short — we just spend too much of it elsewhere. Guard a little for yourself today.',
    ko: '시간이 부족한 게 아니에요. 너무 많이 흘려보내고 있을 뿐이에요. 오늘 조금만 지켜 봐요.',
    ja: '時間が足りないんじゃない。多くを流してるだけ。今日は少し自分のために守ろう。',
  },
  {
    id: 'confucius-2',
    author: 'Confucius',
    en: 'Falling isn’t the story — getting back up every time is.',
    ko: '넘어지지 않는 게 자랑이 아니에요. 넘어질 때마다 일어서는 당신이 멋져요.',
    ja: '倒れないことが自慢じゃない。倒れるたびに起き上がるあなたが素敵だよ。',
  },
  {
    id: 'einstein-1',
    author: 'Albert Einstein',
    en: 'Keep pedaling — balance comes from moving, not from standing still.',
    ko: '페달을 계속 밟아 봐요. 균형은 멈춰 있을 때가 아니라 움직일 때 잡혀요.',
    ja: 'ペダルを踏み続けよう。バランスは止まっているときじゃなく、動いているときに保たれるよ。',
  },
  {
    id: 'twain-2',
    author: 'Mark Twain',
    en: 'Years from now, you’ll regret the things you never tried more than the ones you did.',
    ko: '나중에 보면, 한 일보다 시도하지 않은 일이 더 아쉬울 거예요.',
    ja: 'あとで振り返ると、やったことよりやらなかったことのほうが悔いやすいよ。',
  },
  {
    id: 'emerson-2',
    author: 'Ralph Waldo Emerson',
    en: 'Treat today like one of the best days of your year — it can be.',
    ko: '오늘을 올해 중 가장 좋은 날 중 하나로 대해 봐요. 그렇게 만들 수 있어요.',
    ja: '今日を一年でいちばんいい日のひとつとして扱ってみよう。そうできるよ。',
  },
  {
    id: 'jordan-1',
    author: 'Michael Jordan',
    en: 'Failing again doesn’t mean you’re done — it’s often how you get better.',
    ko: '또 실패했다고 끝이 아니에요. 그게 더 나아지는 과정일 수 있어요.',
    ja: 'また失敗したから終わり、じゃない。それが上達の途中かもしれないよ。',
  },
  {
    id: 'edison-1',
    author: 'Thomas Edison',
    en: 'If it didn’t work, you didn’t fail — you learned one more way that doesn’t.',
    ko: '안 됐다고 실패한 게 아니에요. 안 되는 방법을 하나 더 배운 거예요.',
    ja: 'うまくいかなかった＝失敗じゃない。うまくいかない方法を一つ学んだだけだよ。',
  },
  {
    id: 'disney-1',
    author: 'Walt Disney',
    en: 'Talk less about starting — just begin one small thing now.',
    ko: '시작한다는 말보다, 지금 작은 일 하나만 해봐요.',
    ja: '始める話をするより、今小さなことを一つやってみよう。',
  },
  {
    id: 'anthony-1',
    author: 'Tony Robbins',
    en: 'The only journey that stays impossible is the one you never start.',
    ko: '시작하지 않은 길만 영원히 불가능해요. 오늘 첫 걸음만 내디뎌 봐요.',
    ja: '始めない道だけがずっと不可能なまま。今日、最初の一歩だけ踏み出してみよう。',
  },
  {
    id: 'goggins-1',
    author: 'David Goggins',
    en: 'Comfort is easy — but don’t let it hide how much more you can do.',
    ko: '편안함은 쉬워요. 그래도 당신이 더 할 수 있는 걸 가리지 않게 조심해요.',
    ja: '快適さは楽だよ。でも、もっとできる自分を隠さないようにしよう。',
  },
  {
    id: 'clear-1',
    author: 'James Clear',
    en: 'Goals inspire you, but systems carry you. Strengthen one tiny system today.',
    ko: '목표는 마음을 움직이고, 시스템은 당신을 데려가요. 오늘 작은 루틴 하나만 단단히 해봐요.',
    ja: '目標は気持ちを動かし、仕組みがあなたを運ぶ。今日、小さなルーチンをひとつ固めよう。',
  },
  {
    id: 'brown-1',
    author: 'Brené Brown',
    en: 'Courage or comfort — you can’t fully have both. Pick a brave inch today.',
    ko: '용기와 편안함을 둘 다 꽉 잡을 수는 없어요. 오늘 용기 있는 한 걸음만 골라 봐요.',
    ja: '勇気と快適さを両方まるごと持つのは難しい。今日は勇気ある一歩だけ選ぼう。',
  },
] as const;

function hashDateKey(dateKey: string): number {
  let h = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return h;
}

export type ResolvedDailyQuote = {
  id: string;
  author: string;
  text: string;
};

/** 같은 날짜면 같은 문장 — 로케일만 바뀜 */
export function resolveDailyQuote(
  dateKey: string,
  locale: AppLocale = 'ko',
): ResolvedDailyQuote {
  const list = DAILY_QUOTES;
  const index = hashDateKey(dateKey.trim()) % list.length;
  const entry = list[index]!;
  const text =
    locale === 'ja' ? entry.ja : locale === 'en' ? entry.en : entry.ko;
  return { id: entry.id, author: entry.author, text };
}
