import type { LayoutRectangle } from 'react-native';
export type GuidePose = 'up' | 'down' | 'welcome';
/** Work in the current sheet's coordinates, rather than assuming a fixed phone or keyboard height. */
export function tutorialGuideLayout(width: number, height: number, target: LayoutRectangle | null, place: 'auto' | 'above' = 'auto') {
  if (place === 'above' && target && target.y > 180) {
    const panelWidth = Math.min(width - 24, 360);
    const panelHeight = 176;
    return {
      x: Math.max(12, Math.min(width - panelWidth - 12, (width - panelWidth) / 2)),
      y: 8,
      width: panelWidth,
      height: panelHeight,
      compact: false,
      pose: 'down' as GuidePose,
      flip: false,
    };
  }
  const top = Math.min(160, height * 0.19);
  const bottom = Math.max(top, height - (height < 560 ? 12 : 72));
  const room = target ? Math.max(target.y - top - 12, bottom - target.y - target.height - 12) : bottom - top;
  const compact = height < 560 || room < 292;
  const panelWidth = Math.min(width - 24, compact ? 292 : 252);
  const panelHeight = compact ? 154 : 292;
  if (!target) return { x: Math.max(12, width-panelWidth-16), y: Math.max(top, bottom-panelHeight), width: panelWidth, height: panelHeight, compact, pose: 'welcome' as GuidePose, flip: false };
  const above = Math.max(0, target.y - top - 12);
  const below = Math.max(0, bottom - target.y-target.height - 12);
  const fitsBelow = below >= panelHeight;
  const useBelow = fitsBelow || (above < panelHeight && below >= above);
  const targetX = target.x + target.width/2;
  const x = Math.max(12, Math.min(width-panelWidth-12, targetX < width/2 ? target.x+24 : target.x-panelWidth+target.width-24));
  const y = Math.max(top, Math.min(bottom-panelHeight, useBelow ? target.y+target.height+12 : target.y-panelHeight-12));
  return { x, y, width: panelWidth, height: panelHeight, compact, pose: (useBelow ? 'up' : 'down') as GuidePose, flip: x+panelWidth*0.75 < targetX };
}
