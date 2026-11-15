import vm from 'node:vm';
import { inlineNoteHtml } from './inlineNoteHtml';

function editorRuntime() {
  const children: any[] = [], messages: any[] = [];
  const editor: any = { style: {}, dataset: {}, setAttribute: jest.fn(), addEventListener: jest.fn(), replaceChildren: (fragment: any) => { children.splice(0, children.length, ...fragment.children); }, querySelectorAll: () => children.filter(node => node.tag === 'img') };
  const font = { textContent: '' };
  const load = jest.fn(async () => []);
  const window: any = { ReactNativeWebView: { postMessage: (value: string) => messages.push(JSON.parse(value)) } };
  const document = { getElementById: (id: string) => id === 'editor' ? editor : font, addEventListener: jest.fn(), fonts: { load }, createDocumentFragment: () => ({ children: [] as any[], appendChild(node: any) { this.children.push(node); } }), createElement: (tag: string) => ({ tag, dataset: {}, getAttribute(name: string) { return (this as any)[name]; } }), createTextNode: (text: string) => ({ text }) };
  vm.runInNewContext(inlineNoteHtml.split('<script>')[1].split('</script>')[0], { document, window, requestAnimationFrame: (callback: () => void) => callback() });
  return { window, children, messages, load };
}
it('initializes a long document without rewriting saved content and hydrates repeated icons later', async () => {
  const { window, children, messages, load } = editorRuntime();
  const text = 'Long note\n'.repeat(10000) + '\uFFFC middle \uFFFC';
  await window.note.initialize({ document: { text, icons: ['star', 'star'] }, images: {}, ink: '#222222', size: 17, lineHeight: 25, placeholder: 'Notes', fontUri: 'data:font/ttf;base64,font' });
  expect(load).toHaveBeenCalled();
  expect(messages.map(message => message.type)).toEqual(['ready', 'initialized']);
  expect(children.filter(node => node.tag === 'img')).toHaveLength(2);
  expect(children.filter(node => 'text' in node).map(node => node.text).join('')).toBe(text.replace(/\uFFFC/g, ''));
  window.note.images({ star: 'data:image/png;base64,star' });
  expect(children.filter(node => node.tag === 'img').every(node => node.src === 'data:image/png;base64,star')).toBe(true);
});
it('replaces rather than appends on reinitialization', async () => {
  const { window, children } = editorRuntime();
  const initialize = (text: string) => window.note.initialize({ document: { text, icons: [] }, images: {}, ink: '#222222', size: 17, lineHeight: 25, placeholder: 'Notes' });
  await initialize('Old'); await initialize('New');
  expect(children).toEqual([{ text: 'New' }]);
});
