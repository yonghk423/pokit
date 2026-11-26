import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { requestYes24 } from './index';

export function BookExtras({ itemId }: { itemId: number }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  async function load(operation: 'content' | 'author') {
    setBusy(true);
    try {
      const result = await requestYes24<{ text: string }>({ operation, query: String(itemId) });
      setText(result.text || 'No information available.');
    } catch { setText('Could not load information. Please try again.'); }
    finally { setBusy(false); }
  }
  return <View>
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {(['content', 'author'] as const).map(op => <Pressable key={op} accessibilityRole="button" disabled={busy}
        style={{ paddingVertical: 10 }} onPress={() => load(op)}>
        <ThemedText>{op === 'author' ? 'About the author' : 'Contents'}</ThemedText>
      </Pressable>)}
    </View>
    {(busy || !!text) && <ThemedText>{busy ? 'Loading…' : text}</ThemedText>}
  </View>;
}
