/** Development previews are not user-created mates, even if an old seed saved them in the catalog. */
export function isDevelopmentCatalogSampleKey(key: string): boolean {
  return key.startsWith('customFlow:dev-template:') || key.startsWith('customFlow:dev-concept:');
}
