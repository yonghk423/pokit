// Verify printed lines in each decoded PNG, then project the measurements using the app's renderer.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {PNG} = require('pngjs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename,'utf8');
  module._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
};
const template = require('../docs/design/photo-diary/city-calendar-template.json');
const {fitCalendarArtwork,calendarCellContents} = require('../src/pages/day-plan/lib/illustrationCalendarGeometry.ts');
const {CALENDAR_ARTWORK_LAYOUTS} = require('../src/pages/day-plan/lib/illustrationCalendarLayouts.ts');
const ref = CALENDAR_ARTWORK_LAYOUTS[template.reference];
const [W,H]=template.size;
const [bx,by,bw,bh]=template.board;
const [gx,gy,gw,gh]=template.grid;
const {columns,dateRows}=template;
const devices=[[320,568,20],[375,667,20],[375,812,44],[390,844,59],[393,852,59],[430,932,59],[440,956,62]];
function project(w,h,top) {
  // iOS tab component falls back to 34pt for the home indicator, even on a short screen.
  const tabTop=h-34-56;
  const frame=fitCalendarArtwork(template.reference,w,h,top,56+34+8+12);
  const px=x=>frame.left+x/W*frame.width, py=y=>frame.top+y/H*frame.height;
  for(const box of [template.month,template.weekdays,template.grid]) {
    const [x,y,width,height]=box;
    assert(px(x)>=-.01 && px(x+width)<=w+.01 && py(y)>=top+8-.01 && py(y+height)<=tabTop-12);
  }
  assert(px(bx)>=-.01 && px(bx+bw)<=w+.01 && tabTop-py(by+bh)>=12);
  const cellWidth=frame.width*gw/W/columns, cellHeight=frame.height*gh/H/dateRows;
  const cell=calendarCellContents(cellWidth,cellHeight);
  const a=4*Math.PI/180;
  const halfRotatedHeight=(cell.photoHeight*Math.cos(a)+cell.photoWidth*Math.sin(a))/2;
  const halfRotatedWidth=(cell.photoWidth*Math.cos(a)+cell.photoHeight*Math.sin(a))/2;
  const ringBottom=cell.numberTop+cell.numberHeight+cell.numberSize*.06;
  assert(cell.photoTop+cell.photoHeight/2-halfRotatedHeight>ringBottom);
  assert(halfRotatedWidth<cellWidth/2 && cell.photoTop+cell.photoHeight/2+halfRotatedHeight<cellHeight);
  return {width:w,height:h,gridToTabPt:+(tabTop-py(gy+gh)).toFixed(2),boardToTabPt:+(tabTop-py(by+bh)).toFixed(2)};
}
async function verify(dir) {
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  assert.deepEqual(manifest.template,template);
  assert.equal(ref.sha256,template.referenceSha256);
  assert.deepEqual(ref.size,template.size);
  for(const name of ['month','weekdays','grid']) {
    template[name].forEach((val,i)=>assert(Math.abs(val-ref[name][i]*(i%2?H:W))<.001));
  }
  const files=[];
  for(const item of manifest.files) {
    const bytes=fs.readFileSync(path.join(dir,item.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);
    const {data,width,height} = PNG.sync.read(bytes);
    assert.deepEqual([width,height],[W,H]);
    const at=(x,y)=>{const i=(Math.round(y)*W+Math.round(x))*4;return Math.round((data[i]+data[i+1]+data[i+2])/3);};
    const near=(x,y,horizontal,radius)=>Array.from({length:2*radius+1},(_,i)=>horizontal?at(x+i-radius,y):at(x,y+i-radius)).some(v=>v<95);
    const check=(condition,detail)=>assert(condition,item.file+' '+detail);
    if (template.artwork.mode === 'top-decoration-only' && item.composition) {
      const c=item.composition;
      assert.deepEqual(c.topDecoration,template.artwork.topDecorationBounds);
      assert.deepEqual(c.blankSurface,template.artwork.blankSurfaceBounds);
      assert.deepEqual(c.scene,[0,0,W,template.artwork.topDecorationBounds[1]]);
      const surfaceTop=template.artwork.blankSurfaceBounds[1];
      // Inspect the entire face, including both outer edges and the bottom tab area.
      // Dark marks here would include stray scene details, rails or printed lines.
      for(let y=surfaceTop;y<H;y++) for(let x=0;x<W;x++) {
        const i=(y*W+x)*4;
        check(Math.min(data[i],data[i+1],data[i+2])>200,'nonblank surface at '+x+','+y);
      }
      const [,ty,,th]=template.artwork.topDecorationBounds;
      // Illustrated top ornaments may have open ends and gaps; a solid rail is not required.
      let visible=0;
      for(let y=ty;y<ty+th;y++)for(let x=0;x<W;x++) if(at(x,y)<220)visible++;
      check(visible>=20,'missing top decoration');
      const monthTop=template.month[1];
      check(monthTop>ty+th,'decoration overlaps month');
      files.push({file:item.file,sha256:item.sha256,artworkMode:'top-decoration-only',
        topDecoration:c.topDecoration,blankSurface:c.blankSurface,
        viewports:devices.map(v=>project(...v))});
      continue;
    }
    for(const [area,box,cols,rows] of [['month',template.monthPlate,1,1],['weekday',template.weekdayPlate,columns,1],['date',template.grid,columns,dateRows]]) {
      const [x,y,width,height]=box, cw=width/cols,ch=height/rows;
      for(let r=0;r<rows;r++) {
        const cy=y+(r+.5)*ch;
        for(let c=0;c<=cols;c++) check(near(x+c*cw,cy,true,5),area+' vertical boundary '+c);
        for(let c=0;c<cols;c++) {
          const cx=x+(c+.5)*cw;
          check(at(cx,cy)>135,area+' blank centre '+r+','+c);
          for(let yy=r;yy<=r+1;yy++) check(near(cx,y+yy*ch,false,5),area+' horizontal boundary '+yy);
          // Scan the usable centre for rogue grid lines or rasterized text.
          for(let dy=.20;dy<=.80;dy+=.10)
            for(let dx=.20;dx<=.80;dx+=.10) check(at(x+(c+dx)*cw,y+(r+dy)*ch)>110,area+' interior '+r+','+c);
        }
      }
    }
    for(const x of [bx+bw*.25,bx+bw*.5,bx+bw*.75]) {
      check(near(x,by,false,1) && near(x,by+bh-1,false,1),'physical rim');
    }
    for(const y of [by+bh*.25,by+bh*.5,by+bh*.75]) {
      check(near(bx,y,true,1) && near(bx+bw-1,y,true,1),'physical side edges');
    }
    files.push({file:item.file,sha256:item.sha256,weekdays:columns,dateCells:columns*dateRows,viewports:devices.map(v=>project(...v))});
  }
  const report={template:template.id,reference:template.reference,images:files.length,viewportChecks:files.length*devices.length,files};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.images+' images, '+report.viewportChecks+' viewport cases passed',files[0].viewports);
}
verify(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;});
