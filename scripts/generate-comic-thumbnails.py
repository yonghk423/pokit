#!/usr/bin/env python3
"""Rebuild legacy scene aliases using only the retained representative files.

Do not recreate retired scenes: the manifest deliberately maps many historical IDs
onto five photos to keep existing diaries readable without shipping the old images.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets/activity-illustrations'
rows = json.loads((ASSETS / 'manifest.json').read_text())
for row in rows:
    if not (ASSETS / row['file']).is_file():
        raise FileNotFoundError(row['file'])
lines = ''.join(f"  {json.dumps(row['id'])}: require('../../../../assets/activity-illustrations/{row['file']}'),\n" for row in rows)
(ROOT / 'src/pages/day-plan/lib/heroSceneThumbnails.ts').write_text(
    '/** Historical scene keys share the retained character representatives. */\n'
    'export const COMIC_SCENE_THUMBNAILS = {\n' + lines + '} as const;\n')
print(f'{len(rows)} legacy keys use {len(set(row["file"] for row in rows))} image files.')
