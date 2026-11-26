import mongoose from 'mongoose';
import { Readable } from 'stream';
import { connectDB } from '@/lib/db';

async function getBucket() {
  await connectDB();
  const db = mongoose.connection.db;
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'portal_papers' });
}

export async function uploadBufferToGridFS(buffer, filename, contentType) {
  const bucket = await getBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { contentType },
    });
    const readable = Readable.from(buffer);
    readable
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });
}

export async function readBufferFromGridFS(fileId) {
  const bucket = await getBucket();
  const objectId =
    typeof fileId === 'string'
      ? new mongoose.Types.ObjectId(fileId)
      : fileId;

  return new Promise((resolve, reject) => {
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function deleteFromGridFS(fileId) {
  if (!fileId) return;
  try {
    const bucket = await getBucket();
    const objectId =
      typeof fileId === 'string'
        ? new mongoose.Types.ObjectId(fileId)
        : fileId;
    await bucket.delete(objectId);
  } catch (err) {
    console.error('GridFS delete warning:', err);
  }
}
