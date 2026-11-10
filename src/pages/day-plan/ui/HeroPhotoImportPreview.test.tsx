import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroPhotoImportPreview } from './HeroPhotoImportPreview';
jest.mock('./HeroImageActions', () => ({ HeroImageActions: 'ImageActions' }));
it('opens the full editor for a newly picked photo and saves its edited draft', async () => {
  const save = jest.fn();
  const title = jest.fn();
  const memo = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPhotoImportPreview photo={{ uri: 'file:///picked.jpg' }} visible busy={false} error={null} title="Before" memo="Story" ink="#123456" onSave={save} onClose={jest.fn()} onTitleChange={title} onMemoChange={memo} onPick={jest.fn()} />); });
  try {
    const editor = tree.root.findByType('ImageActions' as never);
    expect(editor.props.editorOnly).toBe(true);
    expect(editor.props.uri).toBe('file:///picked.jpg');
    const draft = { title: 'Edited', memo: 'Changed', date: '2026.11.08', processedUri: 'file:///corrected.jpg' };
    await act(async () => { await editor.props.onSaveDraft(draft); });
    expect(save).toHaveBeenCalledWith(draft);
  } finally { act(() => tree.unmount()); }
});
