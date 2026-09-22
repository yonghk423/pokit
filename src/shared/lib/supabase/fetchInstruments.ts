import { getSupabaseClient, isSupabaseConfigured } from './client';

export type InstrumentRow = {
  id: number;
  name: string;
};

export type FetchInstrumentsResult =
  | { ok: true; rows: InstrumentRow[] }
  | { ok: false; message: string };

/** 연동 스모크 테스트 — `instruments` 테이블 select */
export async function fetchInstruments(): Promise<FetchInstrumentsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase env가 비어 있어요.' };
  }

  try {
    const { data, error } = await getSupabaseClient().from('instruments').select('id, name').order('id');
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, rows: (data ?? []) as InstrumentRow[] };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}
