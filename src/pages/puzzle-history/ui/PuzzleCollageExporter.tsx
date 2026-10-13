import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  listCompletedCollageTiles,
  PUZZLE_INK_WIDTH,
  type PuzzleHistoryTarget,
  type PuzzleInkStroke,
} from '@entities/puzzle-history';

import {
  COLLAGE_EXPORT_HEIGHT,
  COLLAGE_EXPORT_WIDTH,
  readPuzzleImageBase64,
  writeCollageJpeg,
} from '../lib/puzzleCollageFile';

export type CollageExportRequest = {
  id: string;
  imageUri: string;
  title: string;
  targetCount: PuzzleHistoryTarget;
  completedPuzzleIndices: number[];
  ink: PuzzleInkStroke[];
  /** 화면 보드와 같은 시작 배치 */
  layoutSalt?: number;
};

type Props = {
  request: CollageExportRequest | null;
  onResult: (fileUri: string | null) => void;
};

const EXPORT_HTML = `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body>
<script>
function renderCollage(job) {
  try {
    var canvas = document.createElement('canvas');
    canvas.width = job.width;
    canvas.height = job.height;
    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.onload = function () {
      try {
        ctx.fillStyle = '#F5F4F2';
        ctx.fillRect(0, 0, job.width, job.height);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, job.width, job.height);
        ctx.clip();
        var tiles = job.tiles || [];
        for (var i = 0; i < tiles.length; i += 1) {
          drawTile(ctx, img, tiles[i], job);
        }
        drawInk(ctx, job);
        ctx.restore();
        var url = canvas.toDataURL('image/jpeg', 0.92);
        var comma = url.indexOf(',');
        post({ id: job.id, ok: true, base64: comma >= 0 ? url.slice(comma + 1) : '' });
      } catch (error) {
        post({ id: job.id, ok: false });
      }
    };
    img.onerror = function () { post({ id: job.id, ok: false }); };
    img.src = 'data:' + job.mime + ';base64,' + job.base64;
  } catch (error) {
    post({ id: job && job.id, ok: false });
  }
}
function drawTile(ctx, img, tile, job) {
  var width = job.width;
  var height = job.height;
  var x = tile.x * width;
  var y = tile.y * height;
  var w = tile.w * width;
  var h = tile.h * height;
  var border = job.border;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tile.rotate * Math.PI / 180);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-w / 2 + job.shadow, -h / 2 + job.shadow, w, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2 + border, -h / 2 + border, Math.max(1, w - border * 2), Math.max(1, h - border * 2));
  ctx.clip();
  if (tile.fill === 'solid') {
    ctx.fillStyle = tile.solidColor || '#D6D2CB';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  } else {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      -w / 2 + border - tile.imgX * width,
      -h / 2 + border - tile.imgY * height,
      width,
      height
    );
  }
  ctx.restore();
  ctx.restore();
}
function drawInk(ctx, job) {
  var strokes = job.ink || [];
  var width = job.width;
  var height = job.height;
  var sw = (job.inkWidth || 0.009) * width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = sw;
  for (var i = 0; i < strokes.length; i += 1) {
    var stroke = strokes[i];
    var pts = stroke.points || [];
    if (!pts.length) continue;
    var inkColor = stroke.color || '#FFFFFF';
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.fillStyle = inkColor;
      ctx.arc(pts[0].x * width, pts[0].y * height, sw / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    traceInk(ctx, pts, width, height);
    ctx.strokeStyle = inkColor;
    ctx.stroke();
  }
}
function traceInk(ctx, pts, width, height) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x * width, pts[0].y * height);
  for (var j = 1; j < pts.length; j += 1) {
    ctx.lineTo(pts[j].x * width, pts[j].y * height);
  }
}
function post(payload) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }
}
</script>
</body>
</html>`;

export function PuzzleCollageExporter({ request, onResult }: Props) {
  const webRef = useRef<WebView>(null);
  const requestRef = useRef(request);
  const finishedRef = useRef<string | null>(null);
  requestRef.current = request;

  const paintedRef = useRef<string | null>(null);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!request) return;
    finishedRef.current = null;
    const timer = setTimeout(() => {
      if (finishedRef.current === request.id) return;
      finishedRef.current = request.id;
      onResultRef.current(null);
    }, 25000);
    return () => clearTimeout(timer);
  }, [request]);

  const paint = (current: CollageExportRequest) => {
    void (async () => {
      const image = await readPuzzleImageBase64(current.imageUri);
      if (!image || requestRef.current?.id !== current.id || !webRef.current) {
        if (finishedRef.current !== current.id) {
          finishedRef.current = current.id;
          onResultRef.current(null);
        }
        return;
      }
      const tiles = listCompletedCollageTiles(
        current.targetCount,
        current.completedPuzzleIndices,
        current.layoutSalt ?? 0,
      );
      const payload = JSON.stringify({
        id: current.id,
        width: COLLAGE_EXPORT_WIDTH,
        height: COLLAGE_EXPORT_HEIGHT,
        shadow: Math.max(1, Math.round(COLLAGE_EXPORT_WIDTH / 400)),
        border: Math.max(1, Math.round(COLLAGE_EXPORT_WIDTH / 800)),
        mime: image.mime,
        base64: image.base64,
        tiles,
        ink: current.ink,
        inkWidth: PUZZLE_INK_WIDTH,
      });
      webRef.current.injectJavaScript(`window.renderCollage(${payload}); true;`);
    })();
  };

  const onMessage = (event: WebViewMessageEvent) => {
    const current = requestRef.current;
    if (!current || finishedRef.current === current.id) return;
    let parsed: { id?: string; ok?: boolean; base64?: string } | null = null;
    try {
      parsed = JSON.parse(event.nativeEvent.data) as {
        id?: string;
        ok?: boolean;
        base64?: string;
      };
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.id !== current.id) return;
    finishedRef.current = current.id;
    if (!parsed.ok || !parsed.base64) {
      onResultRef.current(null);
      return;
    }
    void writeCollageJpeg(parsed.base64, current.title)
      .then((fileUri) => {
        onResultRef.current(fileUri);
      })
      .catch(() => {
        onResultRef.current(null);
      });
  };

  if (!request) return null;

  return (
    <View pointerEvents="none" style={styles.host}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: EXPORT_HTML }}
        onLoadEnd={() => {
          const current = requestRef.current;
          if (!current || paintedRef.current === current.id) return;
          paintedRef.current = current.id;
          paint(current);
        }}
        onMessage={onMessage}
        javaScriptEnabled
        scrollEnabled={false}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: -4000,
    top: 0,
    width: COLLAGE_EXPORT_WIDTH,
    height: COLLAGE_EXPORT_HEIGHT,
    opacity: 0,
  },
  web: {
    width: COLLAGE_EXPORT_WIDTH,
    height: COLLAGE_EXPORT_HEIGHT,
    backgroundColor: 'transparent',
  },
});
