#!/usr/bin/env node
/**
 * CoreGlyphs → 루틴 피커용 SF Symbol (~1000개, 사용 빈도·도메인 적합도 기준).
 *
 * Usage:
 *   node scripts/generate-sf-symbol-icon-options.mjs
 *   node scripts/generate-sf-symbol-icon-options.mjs --full   # 로케일 제외 전체
 *   node scripts/generate-sf-symbol-icon-options.mjs --limit=1000
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'src/shared/lib/sfSymbolIconOptions.generated.ts');

const PLIST =
  '/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/name_availability.plist';

const LOCALE_VARIANT_RE = /(\.ar|\.he|\.hi|\.ja|\.ko|\.th|\.zh|\.rtl|\.ltr)(\.|$)/;

/** 피커에 항상 포함 (추천 목록과 동일) */
const MUST_INCLUDE = [
  'person.fill',
  'hand.raised.fill',
  'star.fill',
  'heart.fill',
  'flame.fill',
  'leaf.fill',
  'flag.fill',
  'drop.fill',
  'hands.sparkles.fill',
  'cross.case.fill',
  'pill.fill',
  'pills.fill',
  'scalemass.fill',
  'figure.stand',
  'figure.run',
  'figure.yoga',
  'figure.flexibility',
  'figure.walk',
  'figure.mind.and.body',
  'figure.hiking',
  'dumbbell.fill',
  'moon.fill',
  'moon.zzz.fill',
  'wind',
  'sparkles',
  'eye',
  'book.fill',
  'book.closed.fill',
  'graduationcap.fill',
  'calendar.badge.clock',
  'square.and.pencil',
  'character.bubble',
  'paintpalette.fill',
  'paintbrush.pointed.fill',
  'brain',
  'brain.head.profile',
  'timer',
  'headphones',
  'newspaper.fill',
  'tray.2.fill',
  'bag.fill',
  'cart.fill',
  'phone.fill',
  'person.2.fill',
  'person.3.fill',
  'heart.circle.fill',
  'heart.text.square.fill',
  'camera.fill',
  'guitars.fill',
  'frying.pan.fill',
  'tortoise.fill',
  'chevron.left.forwardslash.chevron.right',
];

/** 일상·루틴·헬스 앱에서 자주 쓰는 접두/키워드 (가산점) */
const BOOST_TOKENS = [
  'figure',
  'person',
  'heart',
  'star',
  'flame',
  'leaf',
  'drop',
  'moon',
  'sun',
  'cloud',
  'wind',
  'book',
  'pencil',
  'graduationcap',
  'calendar',
  'clock',
  'timer',
  'alarm',
  'hourglass',
  'brain',
  'eye',
  'hand',
  'dumbbell',
  'sportscourt',
  'soccerball',
  'basketball',
  'tennis',
  'bicycle',
  'figure.run',
  'figure.walk',
  'figure.yoga',
  'pill',
  'cross.case',
  'stethoscope',
  'lungs',
  'fork',
  'cup',
  'mug',
  'frying',
  'cooktop',
  'refrigerator',
  'oven',
  'takeout',
  'cart',
  'bag',
  'basket',
  'phone',
  'message',
  'bubble',
  'mail',
  'camera',
  'photo',
  'music',
  'headphones',
  'mic',
  'guitars',
  'piano',
  'house',
  'bed',
  'shower',
  'sofa',
  'washer',
  'trash',
  'folder',
  'tray',
  'checklist',
  'list',
  'checkmark',
  'flag',
  'bell',
  'paint',
  'lightbulb',
  'briefcase',
  'building',
  'tram',
  'bus',
  'train',
  'car.fill',
  'airplane',
  'map',
  'mappin',
  'creditcard',
  'banknote',
  'wallet',
  'yensign',
  'dollarsign',
  'gamecontroller',
  'tv',
  'film',
  'video',
  'pawprint',
  'cat',
  'dog',
  'tortoise',
  'bird',
  'fish',
  'tree',
  'mountain',
  'beach',
  'umbrella',
  'snowflake',
  'thermometer',
  'humidity',
  'drop.degreesign',
  'sparkles',
  'gift',
  'party',
  'balloon',
  'teddybear',
  'cup.and.saucer',
  'wineglass',
  'waterbottle',
  'figure.strengthtraining',
  'figure.cooldown',
  'figure.mind',
  'figure.hiking',
  'figure.outdoor',
  'scalemass',
  'eyeglasses',
  'text.book',
  'newspaper',
  'note',
  'doc',
  'terminal',
  'laptopcomputer',
  'desktopcomputer',
  'keyboard',
  'repeat',
  'arrow.clockwise',
  'scope',
  'target',
];

/** 피커에 거의 안 쓰는 접두 (감점·제외에 가깝게) */
const PENALTY_PREFIXES = new Set([
  'arrow',
  'arrowshape',
  'arrowtriangle',
  'chevron',
  'inset',
  'rectangle',
  'square',
  'circle',
  'textformat',
  'character',
  'iphone',
  'ipad',
  'ipod',
  'macbook',
  'macpro',
  'macstudio',
  'macmini',
  'imac',
  'appletv',
  'homepod',
  'airpods',
  'beats',
  'poweroutlet',
  'carseat',
  'convertible',
  'suv',
  'pickup',
  'truck',
  'engine',
  'abs',
  'oil',
  'tire',
  'suspension',
  'light',
  'headlight',
  'taillight',
  'mirror',
  'key',
  'cable',
  'hdmi',
  'usb',
  'sdcard',
  'memorychip',
  'internaldrive',
  'externaldrive',
  'opticaldisc',
  'server',
  'switch',
  'gauge',
  'level',
  'slider',
  'dial',
  'joystick',
  'dpad',
  'button',
  'capsule',
  'app',
  'apps',
  'widget',
  'dock',
  'menubar',
  'filemenu',
  'contextualmenu',
  'sidebar',
  'toolbar',
  'pip',
  'square.stack.3d',
]);

const HARD_EXCLUDE_RE = [
  /^\d/, // 숫자 배지
  /^0\d/,
  /^[a-z]\./, // a.book, b.circle 등 알파벳 접두
  /\.and\.(iphone|ipad|ipod|homepod|appletv)/,
  /^info\.circle/,
  /^questionmark/,
  /^exclamationmark\.(circle|triangle|octagon|square)/,
  /^ellipsis/,
  /^line\./,
  /^point\./,
  /^dot\./,
  /^minus\./,
  /^plus\.(circle|square|rectangle)/,
  /^xmark\./,
  /^multiply/,
  /^divide/,
  /^equal/,
  /^lessthan/,
  /^greaterthan/,
  /^curlybraces/,
  /^parentheses/,
  /^bracket/,
];

function parseArgs(argv) {
  let full = false;
  let limit = 1000;
  for (const arg of argv) {
    if (arg === '--full') full = true;
    const m = arg.match(/^--limit=(\d+)$/);
    if (m) limit = Number(m[1]);
  }
  return { full, limit };
}

function scoreIcon(name) {
  if (MUST_INCLUDE.includes(name)) return 100_000;

  for (const re of HARD_EXCLUDE_RE) {
    if (re.test(name)) return -1;
  }

  const parts = name.split('.');
  const head = parts[0] ?? name;
  let score = 0;

  if (PENALTY_PREFIXES.has(head)) score -= 40;

  for (const token of BOOST_TOKENS) {
    if (name === token || name.startsWith(`${token}.`) || name.includes(`.${token}`)) {
      score += token.includes('.') ? 28 : 18;
    }
  }

  // fill 계열을 피커에서 더 쓰기 좋게
  if (name.endsWith('.fill') || name.includes('.fill.')) score += 12;
  else score -= 2;

  // 너무 긴 합성 이름은 감점
  score -= Math.max(0, parts.length - 3) * 6;
  score -= Math.max(0, name.length - 28) * 0.35;

  // 활동 figure 는 남기되, 배지·서클 변형은 강하게 감점
  if (name.startsWith('figure.')) {
    score += 22;
    if (name.includes('.circle') || name.includes('.square')) score -= 55;
    if (name.includes('.badge')) score -= 30;
    // 생소한 종목 배지형보다 기본 포즈 우선
    if (
      /football|archery|fencing|wrestling|equestrian|curling|lacrosse|waterpolo|pickleball|rolling|skating|skiing|snowboarding|surfing|climbing|fishing|hunting/i.test(
        name,
      ) &&
      (name.includes('.circle') || name.includes('.square'))
    ) {
      score -= 40;
    }
  }

  // 한글·잡 문자 버블 등 특수 제외에 가까운 것
  if (name.includes('character.') && !name.includes('character.bubble')) score -= 50;

  return score;
}

function curate(names, limit) {
  const must = MUST_INCLUDE.filter((n) => names.includes(n));
  const scored = names
    .filter((n) => !must.includes(n))
    .map((name) => ({ name, score: scoreIcon(name) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const picked = new Set(must);
  for (const row of scored) {
    if (picked.size >= limit) break;
    picked.add(row.name);
  }

  // fill 우선 유지하되, 동일 베이스의 과도한 변형은 이미 점수로 억제
  return [...picked].sort((a, b) => a.localeCompare(b));
}

const { full, limit } = parseArgs(process.argv.slice(2));

if (!fs.existsSync(PLIST)) {
  console.error(`plist not found: ${PLIST}`);
  process.exit(1);
}

const tmpJson = path.join(os.tmpdir(), `pokit-sf-name-availability-${process.pid}.json`);
execFileSync('plutil', ['-convert', 'json', '-o', tmpJson, PLIST], { stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(tmpJson, 'utf8'));
fs.unlinkSync(tmpJson);

const symbols = data?.symbols;
if (!symbols || typeof symbols !== 'object') {
  console.error('unexpected plist shape: missing symbols');
  process.exit(1);
}

const allNames = Object.keys(symbols)
  .filter((name) => !LOCALE_VARIANT_RE.test(name))
  .sort((a, b) => a.localeCompare(b));

const names = full ? allNames : curate(allNames, limit);
const missingMust = MUST_INCLUDE.filter((n) => !names.includes(n));
if (missingMust.length > 0) {
  console.warn('missing must-include (not in CoreGlyphs):', missingMust.join(', '));
}

const body = names.map((name) => `  '${name.replace(/'/g, "\\'")}',`).join('\n');
const modeNote = full
  ? 'locale variants & restricted excluded'
  : `curated ~${limit} for routine picker (locale variants excluded)`;
const contents = `/** Auto-generated SF Symbol names (${modeNote}). */
export const SF_SYMBOL_ICON_OPTIONS = [
${body}
] as const;

export type SfSymbolIconName = (typeof SF_SYMBOL_ICON_OPTIONS)[number];
`;

fs.writeFileSync(outFile, contents, 'utf8');
console.log(`wrote ${names.length} icons → ${path.relative(root, outFile)}${full ? ' (full)' : ` (curated≤${limit})`}`);
