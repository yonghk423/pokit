// Build the full catalog only from PNGs that passed geometry and visual review.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const digest = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex');
const titles = `운동하기
공부하기
회의하기
빨래하기
업무 보기
독서하기
집에서 영화 보기
후드티 입고 공부하기
커피와 태블릿
공원 산책
사진 촬영
웨이트 트레이닝
요가하기
헤드폰 끼고 달리기
식사하기
영화관 나들이
인터넷 보기
쇼핑하기
등산하기
수영하기
공항 여행
운전하기
아침 스트레칭
침대 정리
스킨케어
옷 갈아입기
아침 식사 준비
요리하기
설거지하기
청소기 돌리기
옷장 정리
식물에 물 주기
장보기
지하철 출근
버스 타기
자전거 타기
일기 쓰기
음악 듣기
피아노 연습
영상 통화
반려견 산책
명상하기
스케치하기
쿠키 굽기
보드게임
캠핑하기
빨래 개기
분리수거
기타 연주
낮잠 자기
침대에서 잠들기
카페에서 독서
침대에서 일기 쓰기
바닷가 여행
창가에서 잡지 읽기
서점 나들이
카페에서 커피 한잔
수족관 관람
도예 공방
종이학 접기
비 오는 창가
바람 부는 날의 우산
기차 기다리기
빈티지 숍
꽃집 나들이
꽃다발 만들기
단추 달기
목도리 뜨개질
차 우리기
빵 반죽하기
길거리 음식
매운 국수
심야 편의점
가구 조립
서랍 수리
식물 분갈이
베란다 새 모이 주기
구두 닦기
물웅덩이 뛰어넘기
눈사람 만들기
모래성 쌓기
배 위에서 바람 쐬기
기차 창가
지도 보기
엽서 쓰기
호텔 아침 식사
천체투영관
미술관 관람
재즈 공연
인형 뽑기
노래방
볼링 치기
배드민턴
롤러스케이트
피크닉
오리 모이 주기
연날리기
망원경으로 별 보기
불꽃놀이 감상
주방에서 춤추기`.split('\n');

(async () => {
  const review = path.resolve('output/warm-sepia-open-panel-v2-100-review');
  const out = path.resolve('output/warm-sepia-open-panel-v2-100-upload');
  const manifest = JSON.parse(await fs.readFile(path.join(review, 'manifest.json')));
  const verified = JSON.parse(await fs.readFile(path.join(review, 'verification.json')));
  const visual = JSON.parse(await fs.readFile(path.join(review, 'visual-review.json')));
  if (titles.length !== 100 || manifest.files.length !== 100 || verified.images !== 100 || verified.viewportChecks !== 700) throw new Error('Incomplete review');
  const hashes = Object.fromEntries(verified.files.map(item => [item.file, item.sha256]));
  await fs.mkdir(path.join(out, 'webp'), { recursive: true });
  await fs.mkdir(path.join(out, 'runtime'), { recursive: true });
  const entries = [];
  for (const [index, item] of manifest.files.entries()) {
    const png = await fs.readFile(path.join(review, item.file));
    const sha256 = digest(png);
    if (sha256 !== hashes[item.file] || sha256 !== visual.sha256[item.file]) throw new Error('Review hash mismatch: ' + item.file);
    const slug = item.file.replace(/\.png$/, '');
    const number = slug.split('-')[0];
    // Preserve the exact already-published 01 WebP; all new files get the same encoder settings.
    const webp = index === 0 ? await fs.readFile('output/warm-sepia-open-panel-v2/webp/01-exercise.webp')
      : await sharp(png).webp({ quality: 95, effort: 6 }).toBuffer();
    await fs.writeFile(path.join(out, item.file), png);
    await fs.writeFile(path.join(out, 'webp', slug + '.webp'), webp);
    entries.push({ ...item, title: titles[index], themeId: 'warm-sepia-open-panel-' + slug,
      design: 'warm-sepia-open-panel-' + number, webpFile: 'webp/' + slug + '.webp',
      webpSha256: digest(webp), webpMd5: digest(webp, 'md5'), webpBytes: webp.length });
    console.log((index + 1) + '/100 packaged ' + slug);
  }
  const pack = { ...manifest, revision: 'warm-sepia-open-panel-v2', storageBucket: 'character-illustrations',
    storagePrefix: 'calendar-themes/warm-sepia-open-panel/20261112-v2/', imageCount: 100,
    status: 'coordinate-verified-ready-to-upload', files: entries,
    totalWebpBytes: entries.reduce((n, item) => n + item.webpBytes, 0) };
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(pack, null, 2) + '\n');
  await fs.copyFile(path.join(review, 'verification.json'), path.join(out, 'verification.json'));
  const themes = entries.map(e => `  { design: '${e.design}', themeId: '${e.themeId}', title: '${e.title}', concept: 'Warm Sepia Open Panel' },`).join('\n');
  await fs.writeFile(path.join(out, 'runtime/warmSepiaThemes.ts'), 'export const WARM_SEPIA_OPEN_PANEL_THEMES = [\n' + themes + '\n] as const;\n');
  const layouts = entries.map(e => `  '${e.themeId}': { ...EVERYDAY_CINEMA_GEOMETRY, sha256: '${e.webpSha256}', md5: '${e.webpMd5}' },`).join('\n');
  await fs.writeFile(path.join(out, 'runtime/warmSepiaLayouts.ts'), "import { EVERYDAY_CINEMA_GEOMETRY } from './everydayCinemaLayouts';\nexport const WARM_SEPIA_OPEN_PANEL_LAYOUTS = {\n" + layouts + '\n};\n');
  const files = entries.map(e => `  '${e.themeId}': '${path.basename(e.webpFile)}',`).join('\n');
  await fs.writeFile(path.join(out, 'runtime/warmSepiaFiles.ts'), 'export const WARM_SEPIA_OPEN_PANEL_FILES: Record<string, string> = {\n' + files + '\n};\n');
  console.log('100 verified masters packaged; total bytes: ' + pack.totalWebpBytes);
})().catch(error => { console.error(error); process.exitCode = 1; });
