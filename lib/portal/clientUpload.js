'use client';

import JSZip from 'jszip';

export const RECOMMENDED_BYTES = 5 * 1024 * 1024; // 5 MB recommended
export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB Cloudinary Free raw limit
const CHUNK_BYTES = 2 * 1024 * 1024; // 2 MB chunks for GridFS fallback

const ALLOWED_EXTENSIONS = ['.doc', '.docx'];

export function isAllowedManuscriptFile(file) {
  if (!file?.name) return false;
  const lower = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function getMimeTypeForName(filename) {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.doc')) {
    return 'application/msword';
  }
  if (lower.endsWith('.zip')) {
    return 'application/zip';
  }
  return 'application/octet-stream';
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

async function recompressEmbeddedImage(blob, ext) {
  const img = await loadImageFromBlob(blob);
  const maxDim = ext === 'png' ? 1400 : 1600;
  let { width, height } = img;

  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const outputMime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const quality = ext === 'png' ? undefined : 0.78;

  const compressedBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, outputMime, quality)
  );

  // Keep whichever is smaller so we never inflate an already-tight image
  if (compressedBlob && compressedBlob.size < blob.size) {
    return compressedBlob;
  }
  return blob;
}

/**
 * Automatically compresses a .docx or .doc file if it exceeds 10 MB.
 * - For .docx: downscales/recompresses large embedded images inside word/media/
 *   while preserving exact internal filenames and repacks with DEFLATE level 9.
 * - For .doc: compresses the legacy binary Word file into a .doc.zip archive.
 */
export async function compressManuscriptIfNeeded(file, onStatus) {
  if (file.size <= MAX_BYTES) {
    return {
      file,
      compressed: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  }

  const lower = file.name.toLowerCase();
  onStatus?.('File exceeds 10 MB — compressing manuscript before upload...');

  if (lower.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const mediaEntries = Object.keys(zip.files).filter((path) => {
      if (zip.files[path].dir) return false;
      const p = path.toLowerCase();
      return (
        p.startsWith('word/media/') &&
        (p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.png') || p.endsWith('.webp'))
      );
    });

    for (const path of mediaEntries) {
      try {
        const rawBlob = await zip.files[path].async('blob');
        if (rawBlob.size > 150 * 1024) {
          const ext = path.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
          const optimized = await recompressEmbeddedImage(rawBlob, ext);
          if (optimized.size < rawBlob.size) {
            zip.file(path, await optimized.arrayBuffer());
          }
        }
      } catch {
        // Keep original media entry if browser cannot decode a specialty format (e.g. EMF/TIFF)
      }
    }

    const repackedBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const compressedFile = new File([repackedBlob], file.name, {
      type: getMimeTypeForName(file.name),
    });

    if (compressedFile.size > MAX_BYTES) {
      throw new Error(
        `Even after auto-compression (${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB), this .docx still exceeds the 10 MB limit. Please reduce high-resolution images inside Word and retry.`
      );
    }

    return {
      file: compressedFile,
      compressed: true,
      originalSize: file.size,
      finalSize: compressedFile.size,
    };
  }

  // Legacy .doc: zip with DEFLATE level 9
  const zip = new JSZip();
  zip.file(file.name, await file.arrayBuffer());
  const zippedBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const zippedName = `${file.name}.zip`;
  const compressedFile = new File([zippedBlob], zippedName, {
    type: 'application/zip',
  });

  if (compressedFile.size > MAX_BYTES) {
    throw new Error(
      `Compressed .doc (${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB) still exceeds the 10 MB limit. Please save as .docx or reduce embedded image sizes.`
    );
  }

  return {
    file: compressedFile,
    compressed: true,
    originalSize: file.size,
    finalSize: compressedFile.size,
  };
}

/**
 * Compresses if > 10 MB, then uploads directly to Cloudinary (when configured)
 * or via 2 MB chunks to MongoDB GridFS (when Cloudinary env vars are not set).
 */
export async function uploadManuscriptFile(rawFile, onStatus) {
  const { file, compressed, originalSize, finalSize } =
    await compressManuscriptIfNeeded(rawFile, onStatus);

  onStatus?.('Preparing secure upload...');

  const signRes = await fetch('/api/portal/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
    }),
  });
  const signData = await signRes.json();
  if (!signRes.ok) {
    throw new Error(signData.error || 'Failed to initialize upload.');
  }

  if (signData.mode === 'cloudinary') {
    onStatus?.('Uploading manuscript to Cloudinary...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', String(signData.timestamp));
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);
    if (signData.publicId) {
      formData.append('public_id', signData.publicId);
    }

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloudName}/raw/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    const cloudData = await cloudRes.json();
    if (!cloudRes.ok) {
      throw new Error(
        cloudData?.error?.message || 'Cloudinary upload failed.'
      );
    }

    return {
      storage: 'cloudinary',
      url: cloudData.secure_url,
      publicId: cloudData.public_id,
      filename: file.name,
      originalName: rawFile.name,
      mimeType: getMimeTypeForName(file.name),
      size: finalSize,
      compressed,
      originalSize,
    };
  }

  // Fallback: 2 MB chunked upload into MongoDB GridFS
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  let result = null;
  for (let i = 0; i < totalChunks; i++) {
    onStatus?.(`Uploading chunk ${i + 1} of ${totalChunks}...`);
    const start = i * CHUNK_BYTES;
    const end = Math.min(file.size, start + CHUNK_BYTES);
    const chunkBlob = file.slice(start, end);

    const fd = new FormData();
    fd.append('uploadId', uploadId);
    fd.append('chunkIndex', String(i));
    fd.append('totalChunks', String(totalChunks));
    fd.append('filename', file.name);
    fd.append('mimeType', getMimeTypeForName(file.name));
    fd.append('chunk', chunkBlob, file.name);

    const chunkRes = await fetch('/api/portal/uploads/chunk', {
      method: 'POST',
      body: fd,
    });
    const chunkData = await chunkRes.json();
    if (!chunkRes.ok) {
      throw new Error(chunkData.error || 'Chunk upload failed.');
    }
    if (chunkData.complete) {
      result = chunkData;
    }
  }

  return {
    storage: 'gridfs',
    gridFsId: result.gridFsId,
    filename: file.name,
    originalName: rawFile.name,
    mimeType: getMimeTypeForName(file.name),
    size: finalSize,
    compressed,
    originalSize,
  };
}
