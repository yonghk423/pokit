"""Review final upper scenes, fixed trim and month area in pages of 25."""
from PIL import Image, ImageDraw
from pathlib import Path
import json
root=Path('output/warm-sepia-open-panel-v2-100-review')
items=json.loads((root/'manifest.json').read_text())['files']
for start in range(0,len(items),25):
 sheet=Image.new('RGB',(1250,1700),'white');d=ImageDraw.Draw(sheet)
 for i,item in enumerate(items[start:start+25]):
  im=Image.open(root/item['file']).crop((0,0,830,1050));im.thumbnail((245,310))
  x=i%5*250;y=i//5*340
  sheet.paste(im,(x,y+25));d.text((x+3,y+5),item['file'],fill='black')
 sheet.save(root/('contact-%03d-%03d.jpg'%(start+1,min(len(items),start+25))),quality=92)
print(len(items),'images on review contact sheets')
