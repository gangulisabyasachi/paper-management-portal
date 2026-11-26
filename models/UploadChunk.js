import mongoose from 'mongoose';

const UploadChunkSchema = new mongoose.Schema({
  uploadId: { type: String, required: true, index: true },
  chunkIndex: { type: Number, required: true },
  totalChunks: { type: Number, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // Auto-cleanup after 1h
});

UploadChunkSchema.index({ uploadId: 1, chunkIndex: 1 }, { unique: true });

const UploadChunk =
  mongoose.models.UploadChunk ||
  mongoose.model('UploadChunk', UploadChunkSchema);

export default UploadChunk;
