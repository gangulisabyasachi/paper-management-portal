import crypto from 'crypto';

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
}

/**
 * Generate a signed upload payload for direct browser -> Cloudinary raw file upload.
 */
export function signCloudinaryUpload({ folder = 'wisdom-portal/papers', publicId }) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = {
    folder,
    ...(publicId ? { public_id: publicId } : {}),
    timestamp,
  };

  const sortedQuery = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(`${sortedQuery}${apiSecret}`)
    .digest('hex');

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    ...(publicId ? { publicId } : {}),
  };
}

/**
 * Delete a raw asset from Cloudinary when a paper is permanently deleted.
 */
export async function deleteCloudinaryRaw(publicId) {
  if (!publicId || !isCloudinaryConfigured()) return;
  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const body = new URLSearchParams({
      public_id: publicId,
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
    });

    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`, {
      method: 'POST',
      body,
    });
  } catch (err) {
    console.error('Cloudinary delete warning:', err);
  }
}
