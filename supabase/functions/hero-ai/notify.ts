import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

export function completionCopy(locale: string, count: number) {
  const copy: Record<string, [string, string]> = {
    ko: ['나의 장면이 완성됐어요', `사진 ${count}장이 준비됐어요. 눌러서 확인해 보세요.`],
    en: ['Your scenes are ready', `${count} images are ready. Tap to view them.`],
    ja: ['あなたのシーンが完成しました', `${count}枚の画像ができました。タップして確認できます。`],
    'zh-TW': ['你的場景完成了', `${count}張圖片已準備好，點一下查看。`],
  };
  return copy[locale] ?? copy.en;
}
/** Claim once across concurrent workers. Notification failure never changes image results. */
export async function notifyCompletion(admin: SupabaseClient, id: string, expoAccessToken?: string) {
  const { data: outputs, error: outputError } = await admin.from('hero_ai_outputs').select('state').eq('job_id', id);
  if (outputError || !outputs?.length || outputs.some(o => ['reserved', 'processing'].includes(o.state))) return;
  const completed = outputs.filter(o => o.state === 'completed').length;
  if (!completed) return;
  const { data: claim, error } = await admin.from('hero_ai_notifications').update({ claimed_at: new Date().toISOString() }).eq('job_id', id).is('claimed_at', null).select('push_token,locale');
  if (error || !claim?.length) return;
  const [title, body] = completionCopy(claim[0].locale, completed);
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}) },
      body: JSON.stringify({ to: claim[0].push_token, title, body, sound: 'default', channelId: 'hero-ai', data: { type: 'hero-ai-complete', jobId: id } }),
      signal: AbortSignal.timeout(8000),
    });
    const ticket = await response.json();
    await admin.from('hero_ai_notifications').update({ ticket_id: ticket.data?.id ?? null, error: response.ok && ticket.data?.status === 'ok' ? null : String(ticket.data?.details?.error ?? 'push_rejected').slice(0, 120) }).eq('job_id', id);
  } catch {
    // Delivery may have been accepted before a network timeout; never repeat a
    // notification with an unknown outcome or retry a billable image operation.
    await admin.from('hero_ai_notifications').update({ error: 'push_connection' }).eq('job_id', id);
  }
}
