import axios from 'axios';

const ASPECT_RATIO_DIMENSIONS = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
};

export function normalizeTaggedProducts(tags = [], aspectRatio = '1:1') {
  const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];
  return tags
    .map((tag) => ({
      product_id: tag.productId || tag.product_id || tag.id,
      x: Math.max(4, Math.min(96, ((Number(tag.x) || 0) / dimensions.width) * 100 || 50)),
      y: Math.max(4, Math.min(96, ((Number(tag.y) || 0) / dimensions.height) * 100 || 62)),
    }))
    .filter((tag) => Boolean(tag.product_id));
}

export async function publishSocialContent({ apiBase, publishData }) {
  const fd = new FormData();
  const normalizedTags = normalizeTaggedProducts(publishData.taggedProducts, publishData.aspectRatio);
  const primaryProductId = normalizedTags[0]?.product_id;
  const sourceFiles = Array.isArray(publishData.sourceFiles) ? publishData.sourceFiles.filter(Boolean) : [];

  if (publishData.contentType === 'reel') {
    if (!publishData.sourceFile) {
      throw new Error('Missing reel source file');
    }

    fd.append('file', publishData.sourceFile);
    fd.append('caption', publishData.caption || '');
    fd.append('location', publishData.location || '');
    fd.append('cover_frame_seconds', String(publishData.reelSettings?.coverFrameSeconds || 0));
    fd.append('trim_start_seconds', String(publishData.reelSettings?.trimStart || 0));
    fd.append('trim_end_seconds', String(publishData.reelSettings?.trimEnd || 0));
    fd.append('playback_rate', String(publishData.reelSettings?.playbackRate || 1));
    fd.append('muted', String(Boolean(publishData.reelSettings?.isMuted)));
    fd.append('slow_motion_enabled', String(Boolean(publishData.reelSettings?.slowMotionEnabled)));
    fd.append('slow_motion_start', String(publishData.reelSettings?.slowMotionStart || 0));
    fd.append('slow_motion_end', String(publishData.reelSettings?.slowMotionEnd || 0));

    if (primaryProductId) {
      fd.append('product_id', primaryProductId);
    }
    if (normalizedTags.length > 0) {
      fd.append('tagged_products_json', JSON.stringify(normalizedTags));
    }

    await axios.post(`${apiBase}/reels`, fd, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return;
  }

  const base64Response = await fetch(publishData.imageData);
  const blob = await base64Response.blob();
  const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' });
  fd.append('caption', publishData.caption || '');
  fd.append('location', publishData.location || '');

  if (publishData.contentType === 'story') {
    fd.append('file', file);
    await axios.post(`${apiBase}/stories`, fd, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return;
  }

  if (primaryProductId) {
    fd.append('product_id', primaryProductId);
  }
  if (normalizedTags.length > 0) {
    fd.append('tagged_products_json', JSON.stringify(normalizedTags));
  }
  if (sourceFiles.length > 1) {
    sourceFiles.forEach((sourceFile) => fd.append('files', sourceFile));
    fd.append('post_type', 'carousel');
  } else {
    fd.append('file', sourceFiles[0] || file);
  }

  await axios.post(`${apiBase}/posts`, fd, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
