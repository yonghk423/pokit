import vm from 'node:vm';
import { inlineNoteHtml } from './inlineNoteHtml';

function editorRuntime() {
  const children: any[] = [], messages: any[] = [];
  const editor: any = { get textContent() { return children.map(node => node.text ?? '').join(''); }, style: {}, dataset: {}, setAttribute: jest.fn(), addEventListener: jest.fn(), replaceChildren: (fragment: any) => { children.splice(0, children.length, ...fragment.children); }, querySelectorAll: () => children.filter(node => node.tag === 'img') };
  const font = { textContent: '' };
  const load = jest.fn(async () => []);
  const window: any = { ReactNativeWebView: { postMessage: (value: string) => messages.push(JSON.parse(value)) } };
  const document = { getElementById: (id: string) => id === 'editor' ? editor : font, addEventListener: jest.fn(), fonts: { load }, createDocumentFragment: () => ({ children: [] as any[], appendChild(node: any) { this.children.push(node); } }), createElement: (tag: string) => ({ tag, dataset: {}, getAttribute(name: string) { return (this as any)[name]; } }), createTextNode: (text: string) => ({ text }) };
  vm.runInNewContext(inlineNoteHtml.split('<script>')[1].split('</script>')[0], { document, window, setTimeout, clearTimeout, requestAnimationFrame: (callback: () => void) => callback() });
  return { window, children, messages, load, editor, document };
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

it('shows the prompt for whitespace or WebKit empty blocks, but not text or images', async () => {
  const { window, children, editor } = editorRuntime();
  await window.note.initialize({ document: { text: '', icons: [] }, images: {}, ink: '#222', size: 17, lineHeight: 25, placeholder: 'Question', dice: true });
  expect(editor.dataset.empty).toBe('true');
  const blur = editor.addEventListener.mock.calls.find(([event]: [string]) => event === 'blur')[1];
  children.splice(0, children.length, { tag: 'div' }, { tag: 'br' }, { text: ' \n' });
  blur();
  expect(editor.dataset.empty).toBe('true');
  children.push({ text: 'My story' });
  blur();
  expect(editor.dataset.empty).toBe('false');
  children.splice(0, children.length, { tag: 'img' });
  blur();
  expect(editor.dataset.empty).toBe('false');
});

it('fades to the latest question when the dice is pressed repeatedly', async () => {
  jest.useFakeTimers();
  try {
    const { window, editor } = editorRuntime();
    await window.note.initialize({ document: { text: '', icons: [] }, images: {}, ink: '#222', size: 17, lineHeight: 25, placeholder: 'First', dice: true });
    window.note.placeholder({ text: 'Second', dice: true, animate: true });
    expect(editor.dataset.placeholder).toBe('First');
    expect(editor.dataset.promptFading).toBe('true');
    window.note.placeholder({ text: 'Third', dice: true, animate: true });
    jest.advanceTimersByTime(120);
    expect(editor.dataset.placeholder).toBe('Third');
    expect(editor.dataset.promptFading).toBe('false');
    window.matchMedia = () => ({ matches: true });
    window.note.placeholder({ text: 'Reduced motion', dice: true, animate: true });
    expect(editor.dataset.placeholder).toBe('Reduced motion');
  } finally { jest.useRealTimers(); }
});

it('cancels a pending question when prompts are disabled during the fade', async () => {
  jest.useFakeTimers();
  try {
    const { window, editor, messages } = editorRuntime();
    await window.note.initialize({ document: { text: '', icons: [] }, images: {}, ink: '#222', size: 17, lineHeight: 25, placeholder: 'First', dice: true });
    window.note.placeholder({ text: 'Pending question', dice: true, animate: true });
    window.note.placeholder({ text: 'Write your story.', dice: false });
    jest.runAllTimers();
    expect(editor.dataset.placeholder).toBe('Write your story.');
    expect(editor.dataset.dice).toBe('false');
    expect(editor.dataset.promptFading).toBe('false');
    expect(messages.some(message => message.type === 'change')).toBe(false);
  } finally { jest.useRealTimers(); }
});

it('does not change saved content or focus while replacing a question', async () => {
  jest.useFakeTimers();
  try {
    const { window, editor, children, messages, document } = editorRuntime();
    await window.note.initialize({ document: { text: 'My actual diary', icons: [] }, images: {}, ink: '#222', size: 17, lineHeight: 25, placeholder: 'First', dice: true });
    Object.assign(document, { activeElement: editor });
    window.note.placeholder({ text: 'Next question', dice: true, animate: true });
    jest.runAllTimers();
    expect(children).toEqual([{ text: 'My actual diary' }]);
    expect(editor.dataset.empty).toBe('false');
    expect(messages.map(message => message.type)).toEqual(['ready', 'initialized']);
    expect((document as any).activeElement).toBe(editor);
  } finally { jest.useRealTimers(); }
});
