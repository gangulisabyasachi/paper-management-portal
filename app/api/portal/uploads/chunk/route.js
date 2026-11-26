import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UploadChunk from '@/models/UploadChunk';
import { verifyPortalSession } from '@/lib/portal/session';
import { uploadBufferToGridFS } from '@/lib/portal/gridfs';

export async function POST(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['submitter', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const uploadId = formData.get('uploadId')?.toString().trim();
    const chunkIndex = parseInt(formData.get('chunkIndex')?.toString() || '', 10);
    const totalChunks = parseInt(formData.get('totalChunks')?.toString() || '', 10);
    const filename = formData.get('filename')?.toString().trim() || 'manuscript.docx';
    const mimeType =
      formData.get('mimeType')?.toString().trim() ||
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const chunk = formData.get('chunk');

    if (
      !uploadId ||
      Number.isNaN(chunkIndex) ||
      Number.isNaN(totalChunks) ||
      !chunk ||
      typeof chunk === 'string'
    ) {
      return NextResponse.json({ error: 'Invalid chunk payload.' }, { status: 400 });
    }

    await connectDB();

    const buffer = Buffer.from(await chunk.arrayBuffer());
    await UploadChunk.findOneAndUpdate(
      { uploadId, chunkIndex },
      { uploadId, chunkIndex, totalChunks, data: buffer },
      { upsert: true, new: true }
    );

    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({ complete: false, chunkIndex });
    }

    const chunks = await UploadChunk.find({ uploadId })
      .sort({ chunkIndex: 1 })
      .lean();

    if (chunks.length !== totalChunks) {
      return NextResponse.json(
        { error: 'Missing file chunks during reassembly.' },
        { status: 400 }
      );
    }

    const fullBuffer = Buffer.concat(
      chunks.map((c) => (Buffer.isBuffer(c.data) ? c.data : Buffer.from(c.data.buffer)))
    );

    if (fullBuffer.length > 10 * 1024 * 1024) {
      await UploadChunk.deleteMany({ uploadId });
      return NextResponse.json(
        { error: 'Manuscript exceeds 10 MB limit.' },
        { status: 400 }
      );
    }

    const gridFsId = await uploadBufferToGridFS(fullBuffer, filename, mimeType);
    await UploadChunk.deleteMany({ uploadId });

    return NextResponse.json({
      complete: true,
      storage: 'gridfs',
      gridFsId: gridFsId.toString(),
      filename,
      mimeType,
      size: fullBuffer.length,
    });
  } catch (error) {
    console.error('POST /api/portal/uploads/chunk error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload chunk.' },
      { status: 500 }
    );
  }
}
