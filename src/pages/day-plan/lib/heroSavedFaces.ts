import AsyncStorage from '@react-native-async-storage/async-storage';
import * as fs from 'expo-file-system/legacy';
export type HeroSavedFace = { id: string; uri: string };
const key = 'pokit:hero-saved-faces:v1';
export async function loadHeroSavedFaces(): Promise<HeroSavedFace[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const values: HeroSavedFace[] = JSON.parse(raw);
    if (!Array.isArray(values)) return [];
    const valid = values.filter(value => typeof value?.id === 'string' && typeof value?.uri === 'string' && value.uri.startsWith(`${fs.documentDirectory}hero-faces/`));
    const files = await Promise.all(valid.map(value => fs.getInfoAsync(value.uri)));
    return valid.filter((_, index) => files[index].exists);
  } catch { return []; }
}
export async function saveHeroFace(uri: string): Promise<HeroSavedFace[]> {
  if (!fs.documentDirectory) throw new Error('save_failed');
  const folder = `${fs.documentDirectory}hero-faces/`;
  await fs.makeDirectoryAsync(folder, { intermediates: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const destination = `${folder}${id}.jpg`;
  const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
  const normalized = await manipulateAsync(uri, [{ resize: { width: 1024 } }], { format: SaveFormat.JPEG, compress: 0.85 });
  try { await fs.copyAsync({ from: normalized.uri, to: destination }); }
  finally { await fs.deleteAsync(normalized.uri, { idempotent: true }).catch(() => undefined); }
  const faces = [...await loadHeroSavedFaces(), { id, uri: destination }];
  try { await AsyncStorage.setItem(key, JSON.stringify(faces)); }
  catch (error) { await fs.deleteAsync(destination, { idempotent: true }).catch(() => undefined); throw error; }
  return faces;
}
export async function deleteHeroFace(id: string): Promise<HeroSavedFace[]> {
  const faces = await loadHeroSavedFaces();
  const remaining = faces.filter(face => face.id !== id);
  await AsyncStorage.setItem(key, JSON.stringify(remaining));
  const removed = faces.find(face => face.id === id);
  if (removed) await fs.deleteAsync(removed.uri, { idempotent: true });
  return remaining;
}
