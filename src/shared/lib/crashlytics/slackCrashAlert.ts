import { Platform } from 'react-native';

import { getDisplayedAppVersionLabel } from '@shared/lib/support';

export type SlackCrashAlertKind =
  | 'fatal_js'
  | 'non_fatal_js'
  | 'previous_execution'
  | 'recorded';

type SlackCrashAlertInput = {
  kind: SlackCrashAlertKind;
  title: string;
  detail?: string;
};

function getWebhookUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_SLACK_CRASH_WEBHOOK_URL?.trim() ?? '';
  if (!raw.startsWith('https://hooks.slack.com/')) return null;
  return raw;
}

/**
 * 크래시/에러 발생 시 Slack Incoming Webhook으로 즉시 POST.
 * Firebase Alerts(새 이슈만)와 달리, 호출될 때마다 전송한다.
 */
export async function postSlackCrashAlert(input: SlackCrashAlertInput): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.warn('[crashlytics] Slack webhook URL missing (EXPO_PUBLIC_SLACK_CRASH_WEBHOOK_URL)');
    return false;
  }

  const version = getDisplayedAppVersionLabel();
  const when = new Date().toISOString();
  const text = [
    `*[POKIT Crash]* ${input.title}`,
    `• kind: \`${input.kind}\``,
    `• version: \`${version}\``,
    `• at: \`${when}\``,
    input.detail ? `• detail:\n\`\`\`\n${input.detail.slice(0, 2500)}\n\`\`\`` : null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.warn('[crashlytics] Slack webhook failed', res.status);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[crashlytics] Slack webhook error', error);
    return false;
  }
}
