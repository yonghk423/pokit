import { listCustomFlowTemplateCatalogEntries } from './customFlowTemplateCatalog';
import { CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS } from './customFlowTemplateConfigs';

describe('listCustomFlowTemplateCatalogEntries', () => {
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
});
