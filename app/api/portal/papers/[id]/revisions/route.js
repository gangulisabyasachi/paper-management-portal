import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import { verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';
import { uploadBufferToGridFS } from '@/lib/portal/gridfs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function isAcceptedDocName(name = '') {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.docx') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.doc.zip')
  );
}

export async function POST(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const paper = await Paper.findById(id);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
    }

    if (paper.submittedBy.toString() !== session.userId) {
      return NextResponse.json(
        { error: 'Only the submitting author can upload revisions.' },
        { status: 403 }
      );
    }

    if (paper.status !== 'revisions_requested') {
      return NextResponse.json(
        { error: 'Revisions can only be uploaded when revisions are requested.' },
        { status: 400 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    const newVersion = (paper.currentVersion || 1) + 1;
    let fileEntry;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const uploadedFileMeta = body?.uploadedFile;
      if (
        !uploadedFileMeta ||
        !isAcceptedDocName(uploadedFileMeta.filename || uploadedFileMeta.originalName)
      ) {
        return NextResponse.json(
          { error: 'Please upload a valid .doc or .docx file.' },
          { status: 400 }
        );
      }
      if (Number(uploadedFileMeta.size) > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Revised manuscript must be 10 MB or smaller.' },
          { status: 400 }
        );
      }

      const sourceName =
        uploadedFileMeta.filename || uploadedFileMeta.originalName || 'revision.docx';
      const ext = sourceName.toLowerCase().endsWith('.doc.zip')
        ? '.doc.zip'
        : sourceName.toLowerCase().endsWith('.docx')
          ? '.docx'
          : '.doc';

      fileEntry = {
        version: newVersion,
        filename: `${paper.paperId}_v${newVersion}${ext}`,
        originalName: uploadedFileMeta.originalName || sourceName,
        mimeType: uploadedFileMeta.mimeType,
        uploadedAt: new Date(),
        size: Number(uploadedFileMeta.size) || 0,
        storage: uploadedFileMeta.storage || 'cloudinary',
        url: uploadedFileMeta.url,
        publicId: uploadedFileMeta.publicId,
        gridFsId: uploadedFileMeta.gridFsId,
      };
    } else {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string' || !isAcceptedDocName(file.name)) {
        return NextResponse.json(
          { error: 'Please upload a valid .doc or .docx file.' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Revised manuscript must be 10 MB or smaller.' },
          { status: 400 }
        );
      }

      const ext = file.name.toLowerCase().endsWith('.docx') ? '.docx' : '.doc';
      const filename = `${paper.paperId}_v${newVersion}${ext}`;
      const mimeType =
        ext === '.docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/msword';
      const buffer = Buffer.from(await file.arrayBuffer());
      const gridFsId = await uploadBufferToGridFS(buffer, filename, mimeType);

      fileEntry = {
        version: newVersion,
        filename,
        originalName: file.name,
        mimeType,
        uploadedAt: new Date(),
        size: file.size,
        storage: 'gridfs',
        gridFsId,
      };
    }

    paper.currentVersion = newVersion;
    paper.files.push(fileEntry);
    paper.status = 'revised';
    await paper.save();

    await logActivity({
      userId: session.userId,
      action: 'REVISION_UPLOADED',
      targetModel: 'Paper',
      targetId: paper._id,
      details: {
        paperId: paper.paperId,
        version: newVersion,
        filename: fileEntry.filename,
        storage: fileEntry.storage,
      },
    });

    return NextResponse.json({ paper });
  } catch (error) {
    console.error('POST /api/portal/papers/[id]/revisions error:', error);
    return NextResponse.json(
      { error: 'Failed to upload revised manuscript.' },
      { status: 500 }
    );
  }
}
