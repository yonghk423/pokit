import { useAppLocaleStore } from '@shared/lib/i18n/model/localeStore';

import { resolveAppliedCustomFlowTemplateLabel } from './customFlowTemplate';
import { listCustomFlowTemplateCatalogEntries } from './customFlowTemplateCatalog';
import { CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS } from './customFlowTemplateConfigs';

describe('listCustomFlowTemplateCatalogEntries', () => {
  beforeEach(() => {
    useAppLocaleStore.setState({ locale: 'ko' });
  });

  it('returns creatable template keys with label and preview', () => {
    const entries = listCustomFlowTemplateCatalogEntries();
    expect(entries).toHaveLength(CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS.length);
    for (const entry of entries) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.previewLines.length).toBeGreaterThan(0);
    }
  });

  it('returns English labels when locale is en', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    const entries = listCustomFlowTemplateCatalogEntries();
    const checklist = entries.find((entry) => entry.key === 'checklist');
    expect(checklist?.label).toBe('Task checklist');
    expect(checklist?.description).toContain('Check off tasks');
  });
});

describe('resolveAppliedCustomFlowTemplateLabel locale', () => {
  it('maps legacy abstain template to checklist label in en', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    expect(resolveAppliedCustomFlowTemplateLabel('abstain')).toBe('Task checklist');
  });
});
