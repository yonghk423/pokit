# Convert app illustrations into WidgetKit image assets (macOS sips).
from pathlib import Path
import json, subprocess
root = Path(__file__).resolve().parents[1]
cat=root/'ios/PokitLiveActivity/ComicScenes.xcassets'
def add(name, source, limit=192):
    dest=cat/(name+'.imageset'); dest.mkdir(exist_ok=True)
    subprocess.run(['sips','-s','format','png','-Z',str(limit),str(source),'--out',str(dest/(name+'.png'))],stdout=subprocess.DEVNULL,check=True)
    (dest/'Contents.json').write_text(json.dumps({'images':[{'filename':name+'.png','idiom':'universal'}],'info':{'author':'xcode','version':1}},indent=2))
for folder,prefix in [('routine-icons','routine_'),('control-illustrations','control_')]:
    for p in (root/'assets'/folder).glob('*.webp'):
        if '@' in p.stem: continue
        high=p.with_name(p.stem+'@3x.webp')
        add(prefix+p.stem,high if high.exists() else p)
add('widget_paper',root/'assets/color-textures/clean-paper.webp',512)
add('widget_grain',root/'assets/color-textures/grain-overlay.png',512)
print('Widget illustration and texture assets prepared')
