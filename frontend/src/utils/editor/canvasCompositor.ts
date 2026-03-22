// @ts-nocheck

interface CompositeOptions {
  backgroundImage?: HTMLImageElement;
  backgroundColor?: string;
  width: number;
  height: number;
  textOverlays: Array<{
    content: string;
    x: number;
    y: number;
    font: string;
    color: string;
    size: number;
    style: 'clean' | 'box' | 'outline';
  }>;
  stickerOverlays: Array<{
    content: string;
    x: number;
    y: number;
  }>;
  drawPaths: Array<{
    points: { x: number; y: number }[];
    color: string;
    width: number;
  }>;
}

export async function compositeStory(options: CompositeOptions): Promise<Blob> {
  const { width, height, backgroundImage, backgroundColor, textOverlays, stickerOverlays, drawPaths } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width * 2; // 2x for retina
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  // 1. Background
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, width, height);
  } else if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Draw paths
  for (const path of drawPaths) {
    if (path.points.length < 2) continue;
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path.points[0].x * width / 100, path.points[0].y * height / 100);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x * width / 100, path.points[i].y * height / 100);
    }
    ctx.stroke();
  }

  // 3. Text overlays
  for (const overlay of textOverlays) {
    const x = (overlay.x / 100) * width;
    const y = (overlay.y / 100) * height;
    ctx.font = `bold ${overlay.size}px ${overlay.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (overlay.style === 'box') {
      const metrics = ctx.measureText(overlay.content);
      const padding = 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.roundRect(x - metrics.width/2 - padding, y - overlay.size/2 - padding/2, metrics.width + padding*2, overlay.size + padding, 8);
      ctx.fill();
    }

    if (overlay.style === 'outline') {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeText(overlay.content, x, y);
    }

    ctx.fillStyle = overlay.color;
    ctx.fillText(overlay.content, x, y);
  }

  // 4. Sticker overlays
  for (const sticker of stickerOverlays) {
    const x = (sticker.x / 100) * width;
    const y = (sticker.y / 100) * height;
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.content, x, y);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92);
  });
}
