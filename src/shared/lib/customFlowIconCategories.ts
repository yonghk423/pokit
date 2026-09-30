/** 루틴 아이콘 피커 분류 (이름 패턴 기반) */

export const CUSTOM_FLOW_ICON_CATEGORY_IDS = [
  'recommended',
  'all',
  'exercise',
  'study',
  'health',
  'life',
  'rest',
  'creative',
] as const;

export type CustomFlowIconCategoryId = (typeof CUSTOM_FLOW_ICON_CATEGORY_IDS)[number];

type CategoryRule = {
  id: Exclude<CustomFlowIconCategoryId, 'recommended' | 'all'>;
  test: (name: string) => boolean;
};

const includesAny = (name: string, tokens: readonly string[]) =>
  tokens.some((token) => name === token || name.startsWith(`${token}.`) || name.includes(token));

const CATEGORY_RULES: readonly CategoryRule[] = [
  {
    id: 'exercise',
    test: (name) =>
      name.startsWith('figure.') ||
      includesAny(name, [
        'dumbbell',
        'sportscourt',
        'soccerball',
        'basketball',
        'tennis',
        'volleyball',
        'baseball',
        'football',
        'bicycle',
        'skateboard',
        'figure.run',
        'figure.walk',
        'figure.yoga',
        'figure.hiking',
        'figure.strengthtraining',
        'figure.cooldown',
        'flame',
      ]),
  },
  {
    id: 'study',
    test: (name) =>
      includesAny(name, [
        'book',
        'graduationcap',
        'pencil',
        'studentdesk',
        'newspaper',
        'text.book',
        'note.text',
        'doc.text',
        'character.bubble',
        'eyeglasses',
        'brain',
        'lightbulb',
        'calendar',
        'square.and.pencil',
      ]),
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
        'scalemass',
        'drop',
        'humidity',
        'allergens',
        'facemask',
      ]),
  },
  {
    id: 'rest',
    test: (name) =>
      includesAny(name, [
        'moon',
        'zzz',
        'bed',
        'wind',
        'figure.mind',
        'sparkles',
        'eyes',
        'eye',
        'sofa',
        'cup.and.saucer',
        'mug',
        'air.purifier',
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
        'magicwand',
      ]),
  },
  {
    id: 'life',
    test: (name) =>
      includesAny(name, [
        'house',
        'cart',
        'bag',
        'basket',
        'fork',
        'frying',
        'cooktop',
        'oven',
        'refrigerator',
        'takeout',
        'cup',
        'phone',
        'message',
        'bubble',
        'mail',
        'car',
        'tram',
        'bus',
        'train',
        'airplane',
        'map',
        'mappin',
        'creditcard',
        'banknote',
        'wallet',
        'trash',
        'washer',
        'shower',
        'soap',
        'pawprint',
        'cat',
        'dog',
        'tortoise',
        'leaf',
        'tree',
        'sun',
        'cloud',
        'umbrella',
        'gift',
        'person',
        'hand',
        'flag',
        'bell',
        'checklist',
        'list',
        'tray',
        'folder',
        'briefcase',
        'building',
        'clock',
        'timer',
        'alarm',
        'hourglass',
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
  life: 'appearance.iconCategory.life',
  rest: 'appearance.iconCategory.rest',
  creative: 'appearance.iconCategory.creative',
} as const;
