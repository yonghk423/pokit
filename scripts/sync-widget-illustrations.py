# Convert app illustrations and comic scenes into compact WidgetKit image assets.
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1]
cat = root / 'ios/PokitLiveActivity/ComicScenes.xcassets'
opt_comics = root / 'assets/activity-illustrations/protagonist-1'


def write_contents(dest: Path, filename: str) -> None:
    (dest / 'Contents.json').write_text(
        json.dumps(
            {
                'images': [{'filename': filename, 'idiom': 'universal'}],
                'info': {'author': 'xcode', 'version': 1},
            },
            indent=2,
        )
        + '\n'
    )


def save_icon_png(name: str, source: Path, limit: int = 144) -> None:
    dest = cat / f'{name}.imageset'
    dest.mkdir(exist_ok=True)
    im = Image.open(source).convert('RGBA')
    im.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
    out = dest / f'{name}.png'
    q.save(out, format='PNG', optimize=True)
    write_contents(dest, out.name)


def save_comic_jpg(scene_id: str, source: Path, max_w: int = 720, quality: int = 78) -> None:
    dest = cat / f'comic_{scene_id}.imageset'
    dest.mkdir(exist_ok=True)
    im = Image.open(source).convert('RGB')
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.Resampling.LANCZOS)
    out = dest / f'comic_{scene_id}.jpg'
    im.save(out, format='JPEG', quality=quality, optimize=True, progressive=True)
    write_contents(dest, out.name)


for folder, prefix in [('routine-icons', 'routine_'), ('control-illustrations', 'control_')]:
    for p in sorted((root / 'assets' / folder).glob('*.webp')):
        if '@' in p.stem:
            continue
        high = p.with_name(p.stem + '@3x.webp')
        save_icon_png(prefix + p.stem, high if high.exists() else p)

# Match the scene-task checkbox to the app's ComicCheck artwork.
for state in ['checked', 'unchecked']:
    save_icon_png(f'comic_check_{state}', root / f'assets/widget/comic-check-{state}.png', 90)

# Widget paper (opaque RGB → compact JPEG) and grain overlay (alpha → quantized PNG)
paper_dest = cat / 'widget_paper.imageset'
paper_dest.mkdir(exist_ok=True)
for stale in paper_dest.glob('widget_paper.*'):
    stale.unlink()
paper_im = Image.open(root / 'assets/color-textures/clean-paper.webp').convert('RGB')
paper_im.thumbnail((384, 384), Image.Resampling.LANCZOS)
paper_im.save(paper_dest / 'widget_paper.jpg', format='JPEG', quality=78, optimize=True, progressive=True)
write_contents(paper_dest, 'widget_paper.jpg')

save_icon_png('widget_grain', root / 'assets/color-textures/grain-overlay.webp', 384)

# Comic scenes: prefer 960px optimized webp when present, else recompress existing widget jpg
for p960 in sorted(opt_comics.glob('*-960.webp')):
    scene_id = p960.name[: -len('-960.webp')]
    save_comic_jpg(scene_id, p960)

for img_set in sorted(cat.glob('comic_*.imageset')):
    scene_id = img_set.name[len('comic_') : -len('.imageset')]
    if (opt_comics / f'{scene_id}-960.webp').exists():
        continue
    existing = next(img_set.glob('*.jpg'), None)
    if existing:
        save_comic_jpg(scene_id, existing)

print('Widget illustration, comic scene, and texture assets optimized')
