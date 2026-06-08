import {
  DEFAULT_CUSTOM_FLOW_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
  resolveCustomFlowCatalogColor,
  resolveCustomFlowCatalogIcon,
} from './defaultPriorityCatalog';

describe('resolveCustomFlowCatalogIcon', () => {
  it('returns a themed icon for builtin custom flows', () => {
    expect(resolveCustomFlowCatalogIcon('customFlow:builtin_hobby_draw')).toBe('paintbrush.pointed.fill');
    expect(resolveCustomFlowCatalogIcon('customFlow:builtin_family_call')).toBe('phone.fill');
    expect(resolveCustomFlowCatalogIcon('customFlow:builtin_mind_nap')).toBe('moon.zzz.fill');
  });

  it('falls back to person.fill for unknown custom flows', () => {
    expect(resolveCustomFlowCatalogIcon('customFlow:user-made-01')).toBe(DEFAULT_CUSTOM_FLOW_ICON);
  });
});

describe('resolveCustomFlowCatalogColor', () => {
  it('returns distinct colors for builtin custom flows', () => {
    expect(resolveCustomFlowCatalogColor('customFlow:builtin_hobby_draw')).toBe('#a855f7');
    expect(resolveCustomFlowCatalogColor('customFlow:builtin_family_call')).toBe('#3b82f6');
    expect(resolveCustomFlowCatalogColor('customFlow:builtin_mind_detox')).toBe('#22c55e');
    expect(
      new Set([
        resolveCustomFlowCatalogColor('customFlow:builtin_hobby_draw'),
        resolveCustomFlowCatalogColor('customFlow:builtin_hobby_guitar'),
        resolveCustomFlowCatalogColor('customFlow:builtin_family_call'),
      ]).size,
    ).toBe(3);
  });

  it('falls back to default orange for unknown custom flows', () => {
    expect(resolveCustomFlowCatalogColor('customFlow:user-made-01')).toBe(DEFAULT_CUSTOM_FLOW_COLOR);
  });
});
