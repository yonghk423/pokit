export type StoreAccessFilter = 'all' | 'free' | 'pro';
export const matchesStoreAccess = (filter: StoreAccessFilter, pro: boolean) => filter === 'all' || (filter === 'pro') === pro;
