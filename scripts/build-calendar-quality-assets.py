"""Copy exact server originals for store display; never resize or recompress them.

Store repair:
  python3 scripts/build-calendar-quality-assets.py --source-root <storage backup>
Native download release (fails if masters are too small; never upscales):
  python3 scripts/build-calendar-quality-assets.py --download-manifest masters.json --download-output output/calendar-hd
The download manifest is {"files": [{"themeId": ..., "source": ...}]}.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / 'docs/design/photo-diary/calendar-image-quality.json').read_text())


def validate_source(source, destination, download=False):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if source == destination:
        raise ValueError(f'Source overwrite forbidden: {source}')
    if any(part in ('paid-calendar-thumbs', 'store-previews') for part in source.parts):
        raise ValueError(f'A store derivative cannot be a master: {source}')
    with Image.open(source) as image:
        width, height = image.size
    minimum = POLICY['minimumDownloadWidth'] if download else POLICY['minimumSourceWidth']
    if width < minimum or height < POLICY['minimumSourceHeight']:
        raise ValueError(f'Native source too small: {source} ({width}x{height}); width must be >= {minimum}. Regenerate from a larger original; do not upscale.')
    return width, height


def export(source, destination, download=False):
    native = validate_source(source, destination, download)
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + '.part')
    try:
        if download:
            with Image.open(source) as image:
                image.convert('RGB').save(temporary, 'WEBP', lossless=True, quality=100, method=6)
        else:
            with Image.open(source) as image:
                if image.format != 'WEBP':
                    raise ValueError('Store assets must be the exact server WebP, not a PNG conversion')
            temporary.write_bytes(Path(source).read_bytes())
        size = native
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    return {'source': str(source), 'sourceSize': list(native), 'sourceSha256': hashlib.sha256(Path(source).read_bytes()).hexdigest(),
            'path': str(destination), 'size': list(size), 'bytes': destination.stat().st_size,
            'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'md5': hashlib.md5(destination.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, default=ROOT / 'output/calendar-quality-repair/server-originals')
    parser.add_argument('--download-manifest', type=Path)
    parser.add_argument('--download-output', type=Path, default=ROOT / 'output/calendar-hd')
    args = parser.parse_args()
    if args.download_manifest:
        entries = json.loads(args.download_manifest.read_text())['files']
        if not entries or len({x['themeId'] for x in entries}) != len(entries):
            raise ValueError('Download manifest must contain unique themes')
        jobs = []
        for item in entries:
            theme = item['themeId']
            if not theme or Path(theme).name != theme or theme in ('.', '..'):
                raise ValueError('Invalid theme ID')
            jobs.append((item['source'], args.download_output / theme / 'background.webp', theme))
        # Check every input before writing anything. Existing release directories are immutable.
        if args.download_output.exists():
            raise ValueError('Download output already exists; choose a new revision directory')
        for source, dest, _ in jobs:
            validate_source(source, dest, download=True)
        files = [{'themeId': theme, **export(source, dest, download=True)} for source, dest, theme in jobs]
        (args.download_output / 'manifest.json').write_text(json.dumps({'files': files, 'status': 'pending-visual-layout-and-storage-readback-review'}, indent=2) + '\n')
        print(f'Encoded {len(files)} native lossless downloads; not published')
        return

    audit = json.loads((ROOT / 'docs/audits/paid-image-assets-20261119/calendar-assets.json').read_text())
    jobs, sources, generated = [], {}, []
    # Use only verified server originals, without decoding, resizing or re-encoding.
    for item in audit['calendars']:
        theme = item['themeId']
        source = args.source_root / item['remotePath']
        destination = ROOT / 'assets/paid-calendar-originals' / f'{theme}.webp'
        sources[theme] = source
        jobs.append((source, destination, theme))
    # Derive the representative theme from each catalog's first entry rather than assuming slugs.
    for cover in audit['packPreviews']:
        theme = next(x['themeId'] for x in audit['calendars'] if x['pack'] == cover['pack'])
        jobs.append((sources[theme], ROOT / cover['path'], theme))
    jobs.append((args.source_root / 'calendar-themes/city-animation/21-couch-after-work/background.webp',
                 ROOT / 'assets/store-previews/city-animation-couch.webp', '21-couch-after-work'))
    for source, dest, _ in jobs:
        validate_source(source, dest)
        with Image.open(source) as image:
            if image.format != 'WEBP':
                raise ValueError('Store source must be server WebP')
    for source, dest, theme in jobs:
        generated.append({'themeId': theme, **export(source, dest)})
    # Rebuild the map separately from the image sources.
    module = '/** Byte-identical Supabase originals for offline store display; no thumbnail variants. */\nexport const PAID_CALENDAR_ORIGINALS: Record<string, number> = {\n'
    for item in audit['calendars']:
        theme = item['themeId']
        module += f"  '{theme}': require('../../../../assets/paid-calendar-originals/{theme}.webp'),\n"
    (ROOT / 'src/pages/day-plan/lib/paidCalendarOriginals.ts').write_text(module + '};\n')
    report = ROOT / 'docs/audits/calendar-quality-repair-20261122.json'
    report.write_text(json.dumps({'policy': POLICY, 'downloadAssetsChanged': False, 'files': generated}, indent=2) + '\n')
    print(f'Copied {len(generated)} byte-identical server originals; no resize or recompression')


if __name__ == '__main__':
    main()
