import type { AppLocale } from '@shared/lib/i18n';
import type { ComicSceneId } from '@pages/day-plan/lib/heroSceneImages';

type SceneCopy = [title: string, memo: string, tasks: string[]];
export const sceneImages: ComicSceneId[] = ['23-morning-stretch', '27-breakfast', '05-work', '09-coffee-tablet', '10-park-walk', '53-diary-in-bed', '46-camping', '11-photography', '54-seaside-trip', '56-bookstore', 'puppy-park-walk', 'puppy-meal', 'puppy-ball-play', 'puppy-bath', 'puppy-nap'];
type MockCopy = {
  name: string; puppy: string; titles: [string, string, string]; scenes: SceneCopy[];
  mateNames: string[]; summaries: string[]; checklists: string[][]; notes: string[][];
};
const mockCopyByLocale: Record<'ko' | 'en' | 'ja', MockCopy> = {
  ko: {
    name: '서연', puppy: '보리', titles: ['바쁜 하루에도 내 속도로', '바람 따라 떠난 주말', '보리의 소소한 하루'],
    scenes: [
      ['조금 느긋한 아침', '알람을 한 번 미뤘지만 휴대폰 대신 창문부터 열었다. 밤새 내린 비 냄새가 들어왔다. 오늘은 모든 일을 잘하려고 애쓰기보다 가장 중요한 세 가지만 끝내기로 했다.', ['물 한 잔 마시기', '어깨와 허리 5분 스트레칭', '오늘 꼭 할 일 세 가지 적기']],
      ['냉장고 속 재료로 아침', '남은 시금치와 달걀로 오믈렛을 만들었다. 빵이 살짝 탔지만 따뜻한 커피와 먹으니 괜찮았다. 내일은 서두르지 않도록 오늘 밤 식탁을 미리 정리해 둬야겠다.', ['달걀과 우유 장보기 목록에 추가', '도시락 챙기기']],
      ['작은 진전도 진전', '오전에는 새 프로젝트의 첫 화면을 정리했다. 피드백을 받고 다시 고친 부분이 많았지만, 헷갈리던 흐름이 조금 선명해졌다. 오후 회의 전에는 수정 이유를 짧게 적어 공유할 예정이다.', ['첫 화면 수정안 공유하기', '금요일 회의 자료 초안 완성', '동료에게 접근성 점검 부탁하기']],
      ['커피 한 잔의 여유', '점심 뒤에 회사 근처 작은 카페에 들렀다. 창가 자리에서 책을 18쪽 읽었다. 해야 할 일이 떠올라도 잠깐은 메모만 해 두고, 이 시간만큼은 쉬는 데 쓰기로 했다.', ['읽고 싶은 문장 한 줄 기록', '텀블러 씻어 두기']],
      ['이어폰 없이 걷기', '퇴근길에 한 정거장 먼저 내렸다. 같은 길인데 은행잎 색이 벌써 달라져 있었다. 걷고 나니 머릿속에서 맴돌던 회의 내용도 조금 가라앉았다.', ['공원 한 바퀴 걷기', '엄마에게 안부 전화']],
      ['오늘 하루를 정리하는 시간', '완료하지 못한 일이 두 개 남았다. 예전 같으면 마음에 걸렸겠지만 오늘은 내일의 나에게 넘겨주기로 했다. 제때 밥을 먹고 산책을 한 것도 오늘의 성과다. 잠들기 전에는 화면을 조금 일찍 내려놓자.', ['내일 일정 확인하기', '가방에 충전기 넣기', '잠들기 30분 전 휴대폰 내려놓기']],
      ['바람 소리로 채운 오후', '텐트를 치는 데 생각보다 오래 걸렸다. 그래도 의자에 앉아 산을 바라보는 순간, 서두른 마음이 풀렸다. 저녁에는 간단히 수프를 데워 먹고 별이 보이면 조금 더 밖에 있어야겠다.', ['텐트 고정 끈 다시 확인', '보온병에 따뜻한 물 담기', '해 지기 전에 저녁 준비']],
      ['사진보다 오래 남는 풍경', '빛이 나뭇잎 사이로 들어오는 시간이 좋아 한참 멈춰 섰다. 사진은 많이 찍지 않았다. 마음에 든 세 장만 골라 집에 돌아가 작은 앨범으로 남겨야겠다.', ['사진 세 장 고르기', '함께 온 친구에게 사진 보내기']],
      ['바다 앞에서는 천천히', '바닷가 작은 가게에서 늦은 점심을 먹었다. 특별한 계획 없이 방파제 끝까지 걸었다. 오랜만에 시간을 확인하지 않은 오후였다.', ['쓰레기 되가져오기', '다음에 올 카페 위치 저장']],
      ['뜻밖에 만난 책', '돌아오는 길에 독립서점에 들렀다. 표지가 마음에 들어 펼친 에세이에서 지금 내게 필요한 문장을 만났다. 다음 주 독서 모임에서 이야기하고 싶어 책갈피를 끼워 두었다.', ['독서 모임 단체방에 책 소개', '마음에 든 문장 42쪽 표시']],
      ['보리의 아침 탐험', '보리가 평소보다 오래 풀 냄새를 맡았다. 빨리 걷게 재촉하지 않고 기다렸더니 돌아오는 길에는 내 옆에서 차분히 걸었다. 산책은 내 운동 시간이면서 보리의 구경 시간이기도 하다.', ['배변 봉투 챙기기', '산책 후 발 닦기', '진드기 확인하기']],
      ['밥그릇이 반짝반짝', '새 사료는 원래 먹던 사료에 조금만 섞었다. 처음에는 냄새를 맡더니 남김없이 먹었다. 물그릇도 씻고 갈아 주었다. 며칠 동안은 배변 상태를 살펴보자.', ['사료 70g 계량', '깨끗한 물 채우기']],
      ['공 하나면 충분해', '보리가 공을 가져오는 대신 내 앞에 내려놓고 다시 달려갔다. 열 번쯤 놀고 나니 혀를 내밀어 잠깐 쉬었다. 미끄러운 바닥에서는 뛰지 않게 매트를 더 넓게 펴 줘야겠다.', ['실내 놀이 15분', '장난감 찢어진 곳 확인']],
      ['목욕 뒤의 작은 소동', '물은 아직 조금 무서워하지만 오늘은 간식 덕분에 발 씻기를 잘 참았다. 드라이어 소리를 낮추고 천천히 말렸다. 수건 속에서 얼굴만 내밀고 있는 모습이 귀여웠다.', ['귀에 물 들어가지 않게 확인', '발가락 사이까지 말리기']],
      ['가장 평화로운 낮잠', '놀고 먹고 씻은 뒤 보리가 자기 방석에 동그랗게 누웠다. 잠결에 발을 움직이는 걸 보니 꿈에서도 뛰나 보다. 나도 옆에서 책을 읽다가 잠깐 눈을 붙였다.', ['다음 예방접종 날짜 확인', '보리 담요 세탁하기']],
    ],
    mateNames: ['출근 전 작은 준비', '이번 주 프로젝트', '장을 보기 전에', '놓치고 싶지 않은 메모', '하루 30쪽 읽기', '물 마시는 습관', '아침 몸 상태', '하루를 마무리하는 순서'],
    summaries: ['급하게 나가지 않도록 15분 먼저 준비하기', '첫 화면 개선 · 금요일 공유까지', '냉장고를 확인하고 필요한 것만 사기', '약속과 아이디어를 잠깐 맡겨 두는 곳', '빨리 읽기보다 매일 조금씩', '커피를 마신 뒤에는 물 한 잔', '숫자 하나보다 일주일의 흐름 보기', '내일의 나를 위해 조금만 정리하기'],
    checklists: [['창문 열고 이불 정리', '물 한 잔과 아침 식사', '도시락·텀블러·충전기', '우산 챙기기'], ['사용자 피드백 세 가지 정리', '첫 화면 와이어프레임 수정', '긴 문장과 큰 글씨로 확인', '팀에 수정안 공유', '금요일 발표 자료 마무리'], ['달걀 10개와 우유', '샐러드 채소·방울토마토', '플레인 요거트', '보리 배변 봉투 리필', '집에 있는 양파는 사지 않기'], ['싱크대와 식탁 정리', '내일 옷과 가방 준비', '오늘 좋았던 일 한 줄', '알람 맞추고 화면 내려놓기']],
    notes: [['목요일 15:00 치과 예약. 회의와 겹치지 않도록 오전에 한 번 더 확인하기.', '독서 모임은 일요일 11시, 역 앞 카페. 각자 기억에 남는 문장 하나씩 준비.', '프로젝트 소개 첫 문장은 기능 설명보다 사용자가 겪는 상황으로 시작해 보기.', '캠핑 준비물: 랜턴 충전, 보온병, 여분 양말. 종이컵 대신 컵 챙기기.']],
  },
  en: {
    name: 'Mia', puppy: 'Barley', titles: ['Finding my pace on a busy day', 'A weekend with room to wander', 'Little moments with Barley'],
    scenes: [
      ['A slower start', 'I snoozed the alarm once, then opened the window before reaching for my phone. The air still smelled of last night’s rain. Instead of doing everything perfectly, I chose three things that would make today feel worthwhile.', ['Drink a glass of water', 'Stretch my shoulders and back for five minutes', 'Write down my three priorities']],
      ['Breakfast from what I had', 'An omelet with the last of the spinach and two eggs. The toast was a little too dark, but warm coffee made up for it. I’ll clear the table tonight so tomorrow’s breakfast feels less rushed.', ['Add eggs and milk to the shopping list', 'Pack lunch before leaving']],
      ['Progress, even in small steps', 'I worked on the opening screen for the new project this morning. There were more revisions than I expected, but the flow finally feels clearer. Before the afternoon meeting, I want to share a short note explaining why I changed it.', ['Share the revised opening screen', 'Draft Friday’s presentation', 'Ask a teammate to check accessibility']],
      ['A coffee-sized break', 'I found a window seat at the little café near work and read eighteen pages. Whenever a task popped into my head, I wrote it down instead of jumping back into work. This half hour was allowed to be a proper break.', ['Save one sentence from the book', 'Wash my travel mug tonight']],
      ['Walking without headphones', 'I got off one stop early and took the park route home. The gingko leaves have changed color since last week. By the time I reached my street, the meeting I’d been replaying in my head felt much smaller.', ['Walk one loop around the park', 'Call Mum on the way home']],
      ['Time to wrap up the day', 'Two tasks are still unfinished. Tonight I’m leaving them for tomorrow instead of carrying them into bed. Eating lunch on time and taking a walk count, too. I’d like to put my phone away a little earlier.', ['Check tomorrow’s calendar', 'Put the charger in my bag', 'Leave my phone alone for the last thirty minutes']],
      ['An afternoon of wind and quiet', 'Pitching the tent took longer than planned. Then I sat down, looked at the hills, and stopped caring about the clock. Soup for dinner, something warm to drink, and maybe a few stars if the clouds clear.', ['Check the tent lines', 'Fill the flask with hot water', 'Start dinner before sunset']],
      ['A view worth pausing for', 'Sunlight kept slipping between the leaves, so I stayed in one spot for a while. I didn’t take many photos. I’ll choose three favorites and make a small album when I get home.', ['Pick three favorite photographs', 'Send a few pictures to Alex']],
      ['No hurry by the sea', 'A late lunch at a tiny place by the harbor, then a walk to the end of the breakwater. There was no plan to keep up with. I can’t remember the last afternoon I went this long without checking the time.', ['Take all our rubbish home', 'Save the café location for next time']],
      ['The book I wasn’t looking for', 'We stopped at an independent bookshop on the way home. I opened an essay collection because I liked the cover and found a sentence I needed this week. I’ve marked the page for our next book club.', ['Introduce the book in the group chat', 'Keep a bookmark on page 42']],
      ['Barley’s morning discoveries', 'Barley wanted to investigate every patch of grass. I stopped hurrying him, and he walked much more calmly beside me on the way back. Our walk is exercise for me and a whole little adventure for him.', ['Pack waste bags', 'Wipe paws after the walk', 'Check for ticks']],
      ['One very clean bowl', 'I mixed a little of the new food into his usual portion. After a careful sniff, he ate the lot. I washed and refilled the water bowl, too. We’ll keep an eye on his digestion for the next few days.', ['Measure 70 g of food', 'Refill with fresh water']],
      ['All you need is a ball', 'Instead of bringing the ball right back, Barley dropped it in front of me and raced away again. After ten rounds we took a water break. I should extend the rug so he isn’t running on the slippery floor.', ['Fifteen minutes of indoor play', 'Check toys for torn seams']],
      ['The post-bath adventure', 'Water is still a little scary, but a few treats helped with paw washing today. I turned the dryer down and took my time. He looked very pleased with himself peeking out of the towel.', ['Keep water out of his ears', 'Dry carefully between the toes']],
      ['The quietest nap', 'Fed, washed, and thoroughly tired, Barley curled up on his cushion. His paws kept twitching in his sleep. Perhaps he was still chasing that ball. I read beside him and ended up closing my eyes for a while, too.', ['Check the next vaccination date', 'Wash Barley’s blanket']],
    ],
    mateNames: ['Before I leave home', 'This week’s project', 'A thoughtful grocery run', 'A place for loose thoughts', 'Thirty pages a day', 'A little more water', 'A morning check-in', 'An easier tomorrow'],
    summaries: ['Fifteen calm minutes instead of a frantic exit', 'Opening-screen improvements · share on Friday', 'Check the fridge, then buy what we need', 'Appointments, reminders, and ideas worth keeping', 'A few pages each day, at my own pace', 'A glass of water after each coffee', 'Look at the week, not just one number', 'A small evening reset for my future self'],
    checklists: [['Open the window and make the bed', 'Water and a proper breakfast', 'Lunch box, mug, and charger', 'Remember the umbrella'], ['Summarize three pieces of user feedback', 'Revise the opening-screen wireframe', 'Check long text and large fonts', 'Share the updated flow with the team', 'Finish Friday’s presentation'], ['Ten eggs and milk', 'Salad leaves and cherry tomatoes', 'Plain yogurt', 'Waste-bag refills for Barley', 'Skip onions: we already have some'], ['Clear the sink and table', 'Lay out clothes and pack my bag', 'Write one good thing about today', 'Set the alarm and put screens away']],
    notes: [['Dentist on Thursday at 3 pm. Check the meeting calendar again in the morning.', 'Book club: Sunday, 11 am, at the café by the station. Bring one sentence that stayed with you.', 'Try opening the project presentation with a real situation rather than a list of features.', 'Camping: charge the lantern, pack a flask and spare socks. Bring mugs instead of paper cups.']],
  },
  ja: {
    name: '美咲', puppy: 'むぎ', titles: ['忙しい日も、自分のペースで', '風に誘われた週末', 'むぎと過ごす小さな一日'],
    scenes: [
      ['少しゆっくり始める朝', 'アラームを一度止めてから、スマホより先に窓を開けた。昨夜の雨の匂いがした。今日は全部を完璧にしようとせず、大切なことを三つだけ終わらせようと思う。', ['水を一杯飲む', '肩と腰を5分ストレッチ', '今日の優先事項を三つ書く']],
      ['冷蔵庫にあるもので朝ごはん', '残っていたほうれん草と卵でオムレツを作った。パンは少し焼きすぎたけれど、温かいコーヒーと一緒なら悪くない。明日の朝に慌てないよう、今夜は食卓を片づけておこう。', ['買い物リストに卵と牛乳を追加', 'お弁当を忘れずに持つ']],
      ['小さくても、ちゃんと前進', '午前中は新しい企画の最初の画面を整理した。意見をもらって直したところは多いけれど、迷っていた流れが少し見えてきた。午後の打ち合わせまでに、変更した理由も短くまとめておきたい。', ['最初の画面の修正案を共有', '金曜の発表資料の下書き', '同僚にアクセシビリティの確認を頼む']],
      ['コーヒー一杯分の休憩', '昼休みに職場の近くの小さなカフェへ。窓際で本を18ページ読んだ。仕事が頭に浮かんでもメモだけして、今は休む時間にする。何もしない余白も必要だと思った。', ['心に残った一文を書き留める', '帰ったらタンブラーを洗う']],
      ['イヤホンを外して歩く', '帰りは一駅手前で降り、公園を通った。先週と同じ道なのに、イチョウの色がもう違う。歩いているうちに、頭の中で繰り返していた会議のことも落ち着いてきた。', ['公園を一周する', '母に近況を電話する']],
      ['一日を整える時間', '終わらなかったことが二つ残った。でも、今日は明日の自分に任せることにした。時間どおりにごはんを食べて散歩もできた。それも今日の成果。寝る前は少し早く画面を閉じよう。', ['明日の予定を確認', 'かばんに充電器を入れる', '寝る30分前にスマホを置く']],
      ['風の音を聞く午後', 'テントを張るのに思ったより時間がかかった。それでも椅子に座って山を眺めたら、急いでいた気持ちがほどけた。夜はスープを温めて、晴れたら少し星を見たい。', ['テントのロープをもう一度確認', '水筒に温かいお湯を入れる', '日が暮れる前に夕食の準備']],
      ['写真より長く残る景色', '木漏れ日がきれいで、しばらく同じ場所に立っていた。写真はたくさん撮らなかった。気に入った三枚だけ選んで、帰ったら小さなアルバムにしよう。', ['お気に入りの写真を三枚選ぶ', '一緒に来た友人に写真を送る']],
      ['海の前では、ゆっくり', '港の小さなお店で遅めのお昼を食べた。特に予定もなく、防波堤の先まで歩く。こんなに時計を見ずに過ごした午後は久しぶりかもしれない。', ['ごみを持ち帰る', 'また来たいカフェの場所を保存']],
      ['探していなかった本との出会い', '帰り道に独立系の本屋へ寄った。表紙にひかれて開いたエッセイに、今の自分に必要な言葉があった。次の読書会で話したくて、しおりを挟んでおいた。', ['読書会のグループに本を紹介', '42ページにしおりを挟む']],
      ['むぎの朝の探検', '今日はいつもより長く草の匂いをかいでいた。急かさず待ってみたら、帰りは落ち着いて隣を歩いてくれた。散歩は私の運動であり、むぎの小さな冒険でもある。', ['うんち袋を持つ', '帰ったら足を拭く', 'マダニがいないか確認']],
      ['ぴかぴかのお皿', '新しいフードはいつものごはんに少しだけ混ぜた。慎重に匂いをかいだあと、残さず食べた。水のお皿も洗って入れ替えた。数日はおなかの調子を見ておこう。', ['フードを70g量る', '新しい水を入れる']],
      ['ボール一つで大満足', 'むぎはボールを目の前に置くと、すぐまた走っていった。十回ほど遊んだら、水を飲んで休憩。滑る床で走らないよう、マットをもう少し広げてあげたい。', ['室内で15分遊ぶ', 'おもちゃのほつれを確認']],
      ['お風呂のあとの小さな騒ぎ', '水はまだ少し苦手だけれど、今日はおやつのおかげで足洗いを頑張った。ドライヤーの音を小さくして、ゆっくり乾かした。タオルから顔だけ出している姿がかわいかった。', ['耳に水が入らないよう確認', '指の間までよく乾かす']],
      ['いちばん穏やかなお昼寝', '遊んで食べてきれいになったむぎが、クッションで丸くなった。寝ながら足が動いている。夢でもボールを追いかけているのかな。隣で本を読んでいた私も、少しうとうとしてしまった。', ['次の予防接種の日を確認', 'むぎの毛布を洗う']],
    ],
    mateNames: ['出かける前の小さな準備', '今週のプロジェクト', '買い物の前に', '忘れたくないメモ', '一日30ページ読む', '水を飲む習慣', '朝の体調チェック', '一日を整える夜の習慣'],
    summaries: ['慌てず出られるよう、15分早めに準備', '最初の画面を改善・金曜に共有', '冷蔵庫を確認して、必要なものだけ', '予定やアイデアを少し預けておく場所', '速さより、毎日少しずつ', 'コーヒーのあとは水を一杯', '一つの数字より、一週間の流れを見る', '明日の自分のために、少し片づける'],
    checklists: [['窓を開けて布団を整える', '水を一杯飲んで朝ごはん', 'お弁当・水筒・充電器', '傘を忘れずに持つ'], ['意見を三つに整理する', '最初の画面の構成を修正', '長い文章と大きい文字で確認', '修正案をチームに共有', '金曜の発表資料を仕上げる'], ['卵10個と牛乳', 'サラダ用の野菜とミニトマト', 'プレーンヨーグルト', 'むぎのうんち袋の詰め替え', '玉ねぎは家にあるので買わない'], ['流し台と食卓を片づける', '明日の服とかばんを準備', '今日よかったことを一行書く', 'アラームを設定して画面を閉じる']],
    notes: [['木曜15時に歯医者。会議と重ならないか、朝にもう一度確認する。', '読書会は日曜11時、駅前のカフェ。心に残った一文を一つずつ持ち寄る。', '企画紹介の最初は、機能の説明より使う人の場面から始めてみたい。', 'キャンプの準備：ランタン充電、水筒、予備の靴下。紙コップではなくマグカップを持つ。']],
  },
};

export const mockCopy: Record<AppLocale, MockCopy> = {
  ...mockCopyByLocale,
  'zh-TW': mockCopyByLocale.en,
};

/** An after-work stop, separate from the bookshop in the weekend diary. */
const bookstoreSceneCopyByLocale: Record<'ko' | 'en' | 'ja', SceneCopy> = {
  ko: ['서점에서 책 고르기', '퇴근길에 서점에 들러 읽고 싶었던 책 세 권을 비교했다. 목차만 보고 고르지 않으려고 각 책의 첫 장을 조금씩 읽었다. 이번에는 짧게 나눠 읽을 수 있는 에세이 한 권을 골랐다. 당장 사지 않은 소설은 제목을 적어 두고, 집에 있는 책을 다 읽은 뒤 다시 만나기로 했다.', ['후보 세 권의 첫 장 읽어 보기', '이번 달 책 예산 안에서 한 권 고르기', '읽고 싶은 책 목록에 소설 추가하기']],
  en: ['Choosing a book at the bookshop', 'I stopped at the bookshop after work and compared three books from my reading list. Rather than deciding from the contents page alone, I read a little of each opening chapter. I chose an essay collection I can dip into on busy evenings. The novel can wait: I saved its title and will come back after finishing the book on my bedside table.', ['Read the opening pages of three candidates', 'Choose one book within this month’s budget', 'Save the novel to my reading wish list']],
  ja: ['本屋で次の一冊を選ぶ', '仕事帰りに本屋へ寄り、気になっていた三冊を比べた。目次だけで決めず、それぞれ最初の章を少しずつ読んでみる。今回は忙しい夜にも少しずつ読めそうなエッセイを一冊選んだ。小説はタイトルを控えて、枕元の本を読み終えてからまた会いに来よう。', ['候補三冊の最初のページを読む', '今月の本の予算内で一冊選ぶ', '読みたい本のリストに小説を追加する']],
};

export const bookstoreSceneCopy: Record<AppLocale, SceneCopy> = {
  ...bookstoreSceneCopyByLocale,
  'zh-TW': bookstoreSceneCopyByLocale.en,
};
