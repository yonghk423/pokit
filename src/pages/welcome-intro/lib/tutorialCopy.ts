import type { AppLocale } from '@shared/lib/i18n';
const ko = {
  brand: '오늘의 주인공', label: '함께 해보기', skip: '나중에', practice: '연습 공간 · 실제 기록에는 추가되지 않아요',
  chooseTitle: '나만의 하루를 담는 두 가지 방법', chooseBody: '어떤 것부터 함께 해볼까요?',
  chooseHint: '먼저 시작해볼 튜토리얼을 선택해 주세요',
  rhythm: '오늘의 메이트', comic: '오늘의 주인공', rhythmDesc: '할 일과 루틴을 카드로 정리해요', comicDesc: '장면을 고르고 한 줄로 남겨요',
  rhythmAdd: '먼저 +를 눌러, 나를 위한 카드 하나를 만들어봐요.', comicAdd: '이번에는 +를 눌러, 기억하고 싶은 장면을 담아봐요.',
  rhythmPick: '할 일 체크를 골라 가볍게 시작해요.', comicPick: '지금 마음에 드는 장면을 하나 골라주세요.',
  rhythmOpen: '첫 카드가 생겼어요. 눌러서 펼쳐볼까요?', comicOpen: '나만의 첫 장면이에요. 눌러서 이야기를 더해봐요.',
  rhythmWrite: '오늘의 기분을 한 줄 적고, 저장을 눌러주세요.', comicWrite: '이 순간에 남기고 싶은 마음을 한 줄 적어주세요.',
  taskCoach: '이 장면에서 해보고 싶은 작은 일도 하나 적어봐요.',
  completeCoach: '기록을 마쳤다면 옆의 동그라미를 눌러주세요.',
  checklist: '할 일 체크', mood: '오늘의 기분', prompt: '오늘의 기분 한 줄 남기기',
  moodHint: '지금 내 마음은 어떤가요?', memoHint: '오늘은 천천히 시작하고 싶다.', taskHint: '예: 깊게 숨 한 번 쉬기',
  save: '저장', addTask: '할 일 추가', add: '추가하기', open: '카드 열기',
  successTitle: '좋아요, 직접 해냈어요!', rhythmSuccess: '첫 오늘의 메이트가 생겼어요. 잘했어요!', comicSuccess: '나만의 첫 장면을 만들고 열어봤어요. 잘했어요!',
  nextComic: '이제 오늘의 주인공도 함께 해봐요', nextRhythm: '이제 오늘의 메이트도 함께 해봐요', seeExamples: '채워진 하루 살펴보기',
  examplesTitle: '이렇게 채워갈 수 있어요', examplesBody: '카드를 옆으로 넘기며 나에게 어울리는 하루를 찾아봐요.', examplesLabel: '예시',
  closingTitle: '오늘의 주인공은, 당신이에요.', closingBody: '작은 실천 하나, 남기고 싶은 순간 하나부터.\n앞으로의 하루도 우리 함께 채워가요.',
  start: '나의 하루 시작하기', review: '앱 평가하기', later: '지금 시작하기', reviewBody: '함께한 첫 기록은 어땠나요? 의견을 남겨주셔도 좋아요.',
  walk: '산책', focus: '집중', rest: '나를 위한 시간', walkMemo: '익숙한 길에서도 새로운 풍경을 만났다.', focusMemo: '오늘은 내 속도로 한 가지씩.', restMemo: '잠깐 멈추니 마음에도 여유가 생겼다.',
  water: '물 한 잔', waterMemo: '나를 챙기는 작은 시작', waterTask: '천천히 한 잔 마시기',
  reading: '책 읽는 시간', readingMemo: '마음에 남는 문장 하나를 적어두기', readingTask: '읽고 싶은 만큼 읽기',
  replay: '튜토리얼', replayDesc: '직접 추가하고 기록하며 함께 배워요', done: '완료',
  endTitle: '튜토리얼을 종료할까요?', endBody: '이 버튼은 지금 단계에 필요 없어요.', endConfirm: '종료', endStay: '계속하기',
};
type Copy = { [K in keyof typeof ko]: string };
const en: Copy = {
  brand: 'YOUR DAY', label: 'Try it together', skip: 'Later', practice: 'Practice space · Your personal records stay separate',
  chooseTitle: 'Two ways to make your day yours', chooseBody: 'Which would you like to try first?', chooseHint: 'Choose a tutorial to try first', rhythm: 'Rhythm Cards', comic: 'Comic Diary', rhythmDesc: 'Organize tasks and routines as cards', comicDesc: 'Pick a scene and leave one line',
  rhythmAdd: 'Tap + to make a little card for yourself.', comicAdd: 'Tap + to add a moment you want to remember.', rhythmPick: 'Choose a checklist for an easy start.', comicPick: 'Choose a scene that feels right today.', rhythmOpen: 'Your first card is here. Tap to open it.', comicOpen: 'Your first scene is here. Tap to add your story.', rhythmWrite: 'Write one line about how you feel, then save it.', comicWrite: 'Write a thought you want to keep with this moment.', taskCoach: 'Add one small thing you would like to do in this scene.', completeCoach: 'When you are ready, tap the circle beside your entry.', checklist: 'Checklist', mood: 'How I feel today', prompt: 'Leave one line about how I feel today', moodHint: 'How am I feeling right now?', memoHint: 'Today, I want to take things slowly.', taskHint: 'e.g. Take one deep breath', save: 'Save', addTask: 'Add task', add: 'Add', open: 'Open card', successTitle: 'You did it!', rhythmSuccess: 'Your first card is ready. Well done!', comicSuccess: 'You created and opened your first scene. Well done!', nextComic: 'Now let’s try Comic Diary', nextRhythm: 'Now let’s try Rhythm Cards', seeExamples: 'Explore a day filled with moments', examplesTitle: 'A little inspiration for your day', examplesBody: 'Swipe through the cards to find what feels like you.', examplesLabel: 'Example', closingTitle: 'You are the main character of your day.', closingBody: 'One small action. One moment to remember.\nLet’s keep making your day yours.', start: 'Start my day', review: 'Rate the app', later: 'Start now', reviewBody: 'How was your first entry? You can share your thoughts with a review.', walk: 'A walk', focus: 'Focus', rest: 'A moment for myself', walkMemo: 'I noticed something new on a familiar path.', focusMemo: 'One thing at a time, at my own pace.', restMemo: 'A small pause made room for a little peace.', water: 'A glass of water', waterMemo: 'A small way to care for myself', waterTask: 'Enjoy a glass slowly', reading: 'Time with a book', readingMemo: 'Keep a sentence that stays with me', readingTask: 'Read as much as I feel like', replay: 'Tutorial', replayDesc: 'Learn together by adding and recording', done: 'Done', endTitle: 'End the tutorial?', endBody: 'This button isn’t part of the current step.', endConfirm: 'End', endStay: 'Keep going',
};
const ja: Copy = {
  brand: 'YOUR DAY', label: '一緒にやってみよう', skip: 'あとで', practice: '練習用の画面 · 実際の記録には追加されません',
  chooseTitle: '自分らしい一日をつくる、ふたつの方法', chooseBody: 'どちらから始めましょうか？', chooseHint: '先に始めてみるチュートリアルを選んでください', rhythm: 'リズムカード', comic: '漫画日記', rhythmDesc: 'やることとルーチンをカードで整理', comicDesc: '場面を選んで一行で残す', rhythmAdd: 'まずは＋を押して、自分のためのカードを作りましょう。', comicAdd: '＋を押して、覚えておきたい場面を追加しましょう。', rhythmPick: 'チェックリストを選んで、気軽に始めましょう。', comicPick: '今の気分に合う場面をひとつ選んでください。', rhythmOpen: '最初のカードができました。押して開いてみましょう。', comicOpen: '最初の場面です。押して物語を添えましょう。', rhythmWrite: '今日の気分を一行書いて、保存を押してください。', comicWrite: 'この瞬間に残しておきたい気持ちを一行書きましょう。', taskCoach: 'この場面でやってみたい小さなことも書いてみましょう。', completeCoach: '記録できたら、横の丸を押してください。', checklist: 'チェックリスト', mood: '今日の気分', prompt: '今日の気分を一行残す', moodHint: '今、どんな気持ちですか？', memoHint: '今日はゆっくり始めたい。', taskHint: '例：一度ゆっくり深呼吸する', save: '保存', addTask: 'やることを追加', add: '追加する', open: 'カードを開く', successTitle: 'できましたね！', rhythmSuccess: '最初のカードができました。よくできました！', comicSuccess: '最初の場面を作って開けました。よくできました！', nextComic: '次は漫画日記を試しましょう', nextRhythm: '次はリズムカードを試しましょう', seeExamples: '記録のある一日を見てみる', examplesTitle: 'こんなふうに彩れます', examplesBody: 'カードを横にめくって、自分らしい一日を探しましょう。', examplesLabel: 'サンプル', closingTitle: '今日の主役は、あなた。', closingBody: '小さな実践ひとつ、残したい瞬間ひとつから。\nこれからの一日も、一緒につくりましょう。', start: '自分の一日を始める', review: 'アプリを評価する', later: '今すぐ始める', reviewBody: '最初の記録はいかがでしたか？感想を聞かせてもらえたらうれしいです。', walk: '散歩', focus: '集中', rest: '自分のための時間', walkMemo: 'いつもの道で、新しい景色に出会った。', focusMemo: '今日は自分のペースで、ひとつずつ。', restMemo: '少し立ち止まると、心にも余裕ができた。', water: 'コップ一杯の水', waterMemo: '自分をいたわる小さな始まり', waterTask: 'ゆっくり一杯飲む', reading: '本と過ごす時間', readingMemo: '心に残った一文を書き留める', readingTask: '読みたい分だけ読む', replay: 'チュートリアル', replayDesc: '追加と記録を一緒に体験しましょう', done: '完了', endTitle: 'チュートリアルを終了しますか？', endBody: 'このボタンは今の手順には必要ありません。', endConfirm: '終了', endStay: '続ける',
};
const zh: Copy = {
  brand: '今日的主角', label: '一起試試看', skip: '稍後', practice: '練習空間 · 不會寫進真正的紀錄',
  chooseTitle: '把一天留給自己的兩種方式', chooseBody: '想先從哪一個開始？',
  chooseHint: '請先選一個想試的教學',
  rhythm: '今日夥伴', comic: '今日的主角', rhythmDesc: '用卡片整理待辦和例行', comicDesc: '選一個場景，留下一行',
  rhythmAdd: '先按 +，做一張給自己的卡片。', comicAdd: '這次按 +，留下想記住的場景。',
  rhythmPick: '選一個待辦檢查，輕輕開始。', comicPick: '選一個現在喜歡的場景。',
  rhythmOpen: '第一張卡片好了。要打開看看嗎？', comicOpen: '這是你的第一個場景。打開來把故事補上吧。',
  rhythmWrite: '用一行寫下今天的心情，再按儲存。', comicWrite: '用一行寫下想留在這一刻的心情。',
  taskCoach: '也寫下一件想在這個場景做的小事。',
  completeCoach: '記好了就按旁邊的圓圈。',
  checklist: '待辦檢查', mood: '今天的心情', prompt: '用一行留下今天的心情',
  moodHint: '現在的心情是什麼？', memoHint: '今天想慢慢開始。', taskHint: '例如：深深吸一口氣',
  save: '儲存', addTask: '新增待辦', add: '新增', open: '打開卡片',
  successTitle: '很好，你自己做到了！', rhythmSuccess: '第一個今日夥伴完成了。做得好！', comicSuccess: '你做出並打開了第一個場景。做得好！',
  nextComic: '接下來也試試今日的主角', nextRhythm: '接下來也試試今日夥伴', seeExamples: '看看填好的一天',
  examplesTitle: '可以這樣填滿', examplesBody: '左右滑動卡片，找找適合自己的一天。', examplesLabel: '範例',
  closingTitle: '今天的主角，是你。', closingBody: '一個小小的行動，一個想留下的瞬間。\n往後的每一天，也一起填滿吧。',
  start: '開始我的一天', review: '評價 App', later: '現在開始', reviewBody: '第一次的紀錄感覺如何？也歡迎留下意見。',
  walk: '散步', focus: '專注', rest: '留給自己的時間', walkMemo: '在熟悉的路上，也遇見了新的風景。', focusMemo: '今天用自己的速度，一件一件來。', restMemo: '停一下，心裡也有了餘裕。',
  water: '一杯水', waterMemo: '照顧自己的小小開始', waterTask: '慢慢喝完一杯',
  reading: '讀書的時間', readingMemo: '記下一個留在心裡的句子', readingTask: '讀到自己想停的地方',
  replay: '教學', replayDesc: '一邊新增、一邊記錄，一起學', done: '完成',
  endTitle: '要結束教學嗎？', endBody: '這個按鈕不是現在這一步需要的。', endConfirm: '結束', endStay: '繼續',
};
export function tutorialCopy(locale: AppLocale): Copy {
  if (locale === 'ja') return ja;
  if (locale === 'zh-TW') return zh;
  if (locale === 'en') return en;
  return ko;
}
