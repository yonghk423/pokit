import {
  registerCategoryKeyByDisplayNameResolver,
  resolveRegisteredCategoryKeyByDisplayName,
} from './categoryKeyByDisplayNameResolver';

describe('categoryKeyByDisplayNameResolver', () => {
  afterEach(() => {
    registerCategoryKeyByDisplayNameResolver(null);
  });

  it('uses registered resolver', () => {
    registerCategoryKeyByDisplayNameResolver((label) =>
      label === '나만의 항목' ? 'customFlow:abc' : null,
    );
    expect(resolveRegisteredCategoryKeyByDisplayName('나만의 항목')).toBe('customFlow:abc');
    expect(resolveRegisteredCategoryKeyByDisplayName('')).toBeNull();
    expect(resolveRegisteredCategoryKeyByDisplayName('없음')).toBeNull();
  });
});
