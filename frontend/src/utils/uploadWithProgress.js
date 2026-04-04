/**
 * Upload a file with real progress tracking via XMLHttpRequest.
 * Native fetch() does not support upload progress events.
 *
 * @param {string} url - Full URL to POST to
 * @param {FormData} formData - The form data to upload
 * @param {(pct: number) => void} onProgress - Called with 0-100 as upload progresses
 * @param {string} [token] - Optional auth token (Bearer)
 * @returns {Promise<any>} Parsed JSON response
 */
export default function uploadWithProgress(url, formData, onProgress, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({ ok: true, status: xhr.status });
        }
      } else {
        try {
          reject(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.send(formData);
  });
}
