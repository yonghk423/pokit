/** 루틴 아이콘 피커 분류 (SF Symbol 이름 세그먼트 기반) */

export const CUSTOM_FLOW_ICON_CATEGORY_IDS = [
  'recommended',
  'all',
  'exercise',
  'study',
  'health',
  'food',
  'tools',
  'travel',
  'nature',
  'people',
  'rest',
  'creative',
  'life',
] as const;

export type CustomFlowIconCategoryId = (typeof CUSTOM_FLOW_ICON_CATEGORY_IDS)[number];

type CategoryRule = {
  id: Exclude<CustomFlowIconCategoryId, 'recommended' | 'all'>;
  test: (name: string) => boolean;
};

/** 토큰이 경로 세그먼트와 일치할 때만 (car ≠ carbon) */
function matchesToken(name: string, token: string): boolean {
  if (token.includes('.')) {
    return (
      name === token ||
      name.startsWith(`${token}.`) ||
      name.includes(`.${token}.`) ||
      name.endsWith(`.${token}`)
    );
  }
  return name.split('.').some((part) => part === token);
}

const includesAny = (name: string, tokens: readonly string[]) =>
  tokens.some((token) => matchesToken(name, token));

/** figure.* 중 운동이 아닌 포즈 */
function isNonExerciseFigure(name: string): boolean {
  return (
    name.startsWith('figure.mind') ||
    name.includes('.mind.') ||
    name.startsWith('figure.socialdance') ||
    name.startsWith('figure.seated') ||
    name.startsWith('figure.stand') ||
    name.startsWith('figure.wave') ||
    name.startsWith('figure.fall') ||
    name.startsWith('figure.arms.open')
  );
}

/**
 * 더 구체적인 규칙이 앞에 온다. 매칭 없으면 `life`.
 * tools → exercise → health → study → food → travel → nature → people → rest → creative → life
 */
const CATEGORY_RULES: readonly CategoryRule[] = [
  {
    id: 'tools',
    test: (name) =>
      includesAny(name, [
        'wrench',
        'hammer',
        'screwdriver',
        'gearshape',
        'scissors',
        'ruler',
        'flashlight',
        'helmet',
        'powercord',
        'toolbox',
        'compass.drawing',
        'pencil.and.ruler',
        'book.and.wrench',
        'display.and.screwdriver',
        'wrench.and.screwdriver',
        'wrench.adjustable',
        'level',
        'paintbrush',
        'paintbrush.pointed',
        'hammer.fill',
        'screwdriver.fill',
        'axe',
        'saw',
        'drill',
        'ladder',
        'shovel',
        'pickaxe',
        'measuringtape',
        'tape.measure',
        'caliper',
        'utilityknife',
      ]),
  },
  {
    id: 'exercise',
    test: (name) => {
      if (name.startsWith('figure.') && !isNonExerciseFigure(name)) return true;
      return includesAny(name, [
        'dumbbell',
        'sportscourt',
        'soccerball',
        'basketball',
        'tennis',
        'tennisball',
        'volleyball',
        'baseball',
        'football',
        'rugbyball',
        'cricket',
        'hockey',
        'bicycle',
        'skateboard',
        'skis',
        'snowboard',
        'surfboard',
        'figure.run',
        'figure.walk',
        'figure.yoga',
        'figure.hiking',
        'figure.strengthtraining',
        'figure.cooldown',
        'figure.flexibility',
        'figure.pool.swim',
        'figure.outdoor.cycle',
        'flame',
        'medal',
        'trophy',
        'flag.checkered',
        'shoeprints',
      ]);
    },
  },
  {
    id: 'health',
    test: (name) =>
      includesAny(name, [
        'heart',
        'pill',
        'pills',
        'cross.case',
        'stethoscope',
        'lungs',
        'medical',
        'syringe',
        'staroflife',
        'ivfluid',
        'waveform.path.ecg',
        'ecg',
        'scalemass',
        'drop',
        'humidity',
        'allergens',
        'facemask',
        'bandage',
        'pills.fill',
        'cross',
        'thermometer',
        'microbe',
        'virus',
        'ear',
        'hearingdevice',
        'waterbottle',
      ]) && !includesAny(name, ['heart.text', 'heart.circle', 'suite.heart']),
  },
  {
    id: 'study',
    test: (name) => {
      if (includesAny(name, ['book.and.wrench', 'wrench', 'screwdriver'])) return false;
      return includesAny(name, [
        'book',
        'books.vertical',
        'graduationcap',
        'pencil',
        'studentdesk',
        'newspaper',
        'text.book',
        'note.text',
        'doc.text',
        'doc.plaintext',
        'doc.richtext',
        'character.bubble',
        'eyeglasses',
        'brain',
        'lightbulb',
        'calendar',
        'square.and.pencil',
        'bookmark',
        'textformat',
        'spellcheck',
        'function',
        'sum',
        'x.squareroot',
        'chart.bar',
        'chart.xyaxis',
        'chart.pie',
        'list.bullet.clipboard',
        'checklist',
        'note',
        'doc',
        'folder',
        'archivebox',
        'tray.full',
        'paperclip',
        'highlighter',
        'eraser',
      ]);
    },
  },
  {
    id: 'food',
    test: (name) =>
      includesAny(name, [
        'fork',
        'knife',
        'frying',
        'cooktop',
        'oven',
        'refrigerator',
        'microwave',
        'dishwasher',
        'takeout',
        'cup',
        'mug',
        'cup.and.saucer',
        'wineglass',
        'birthday.cake',
        'carrot',
        'flame.cooktop',
        'pot',
        'frying.pan',
        'toaster',
        'juicer',
        'basket',
        'carrot.fill',
        'leaf.arrow',
        'takeoutbag',
        'waterbottle',
      ]),
  },
  {
    id: 'travel',
    test: (name) =>
      includesAny(name, [
        'car',
        'tram',
        'bus',
        'train',
        'airplane',
        'bicycle',
        'scooter',
        'ferry',
        'sailboat',
        'fuelpump',
        'map',
        'mappin',
        'location',
        'globe',
        'suitcase',
        'backpack',
        'binoculars',
        'road',
        'parking',
        'steeringwheel',
        'ev.charger',
        'point.topleft',
      ]),
  },
  {
    id: 'nature',
    test: (name) =>
      includesAny(name, [
        'leaf',
        'tree',
        'sun',
        'cloud',
        'umbrella',
        'snowflake',
        'moon',
        'mountain',
        'beach',
        'water',
        'drop.degreesign',
        'humidity',
        'wind',
        'tornado',
        'hurricane',
        'rainbow',
        'pawprint',
        'cat',
        'dog',
        'tortoise',
        'bird',
        'fish',
        'ant',
        'ladybug',
        'lizard',
        'hare',
        'teddybear',
        'camera.macro',
        'fossil.shell',
        'flower',
        'carrot',
      ]) && !name.startsWith('moon.zzz'),
  },
  {
    id: 'people',
    test: (name) =>
      includesAny(name, [
        'person',
        'person.2',
        'person.3',
        'people',
        'hand',
        'hands',
        'figure.stand',
        'figure.wave',
        'figure.arms.open',
        'figure.seated',
        'figure.socialdance',
        'face.smiling',
        'face.dashed',
        'mouth',
        'mustache',
        'nose',
        'eye',
        'eyes',
        'ear',
        'hand.raised',
        'hand.wave',
        'hand.thumbsup',
        'hand.point',
        'shared.with.you',
      ]),
  },
  {
    id: 'rest',
    test: (name) =>
      name.startsWith('figure.mind') ||
      name.startsWith('moon.zzz') ||
      includesAny(name, [
        'zzz',
        'bed',
        'sofa',
        'air.purifier',
        'humidifier',
        'fan',
        'sparkles',
        'cup.and.saucer',
        'mug',
        'bathtub',
        'shower',
        'soap',
        'comb',
        'pillow',
        'lamp',
        'light.max',
        'light.min',
      ]),
  },
  {
    id: 'creative',
    test: (name) =>
      includesAny(name, [
        'paint',
        'paintbrush',
        'paintpalette',
        'camera',
        'photo',
        'music',
        'headphones',
        'guitars',
        'piano',
        'mic',
        'film',
        'tv',
        'video',
        'gamecontroller',
        'theatermasks',
        'theatermask',
        'magicwand',
        'wand',
        'ticket',
        'pianokeys',
        'music.mic',
        'music.note',
        'radio',
        'hifispeaker',
        'amplifier',
        'recordingtape',
        'cue',
        'dice',
        'puzzlepiece',
        'crayon',
        'scribble',
        'skew',
      ]) && !includesAny(name, ['paintbrush.pointed', 'screwdriver']),
  },
  {
    id: 'life',
    test: (name) =>
      includesAny(name, [
        'house',
        'cart',
        'bag',
        'basket',
        'phone',
        'message',
        'bubble',
        'mail',
        'creditcard',
        'banknote',
        'wallet',
        'trash',
        'washer',
        'dryer',
        'gift',
        'flag',
        'bell',
        'list',
        'tray',
        'briefcase',
        'building',
        'clock',
        'timer',
        'alarm',
        'hourglass',
        'key',
        'lock',
        'shippingbox',
        'cabinet',
        'door',
        'window',
        'sofa',
        'lamp.desk',
        'chair',
        'table.furniture',
        'washer.fill',
        'storefront',
        'tag',
        'barcode',
        'qrcode',
        'yensign',
        'dollarsign',
        'wonsign',
        'coloncurrencysign',
      ]),
  },
];

export function resolveCustomFlowIconCategory(name: string): Exclude<
  CustomFlowIconCategoryId,
  'recommended' | 'all'
> {
  for (const rule of CATEGORY_RULES) {
    if (rule.test(name)) return rule.id;
  }
  return 'life';
}

export function iconMatchesCategory(
  name: string,
  category: CustomFlowIconCategoryId,
  recommendedSet: ReadonlySet<string>,
): boolean {
  if (category === 'all') return true;
  if (category === 'recommended') return recommendedSet.has(name);
  return resolveCustomFlowIconCategory(name) === category;
}

export const CUSTOM_FLOW_ICON_CATEGORY_I18N_KEYS = {
  recommended: 'appearance.iconCategory.recommended',
  all: 'appearance.iconCategory.all',
  exercise: 'appearance.iconCategory.exercise',
  study: 'appearance.iconCategory.study',
  health: 'appearance.iconCategory.health',
  food: 'appearance.iconCategory.food',
  tools: 'appearance.iconCategory.tools',
  travel: 'appearance.iconCategory.travel',
  nature: 'appearance.iconCategory.nature',
  people: 'appearance.iconCategory.people',
  life: 'appearance.iconCategory.life',
  rest: 'appearance.iconCategory.rest',
  creative: 'appearance.iconCategory.creative',
} as const;
