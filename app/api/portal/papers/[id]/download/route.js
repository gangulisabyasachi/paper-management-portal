import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import Review from '@/models/Review';
import { verifyPortalSession } from '@/lib/portal/session';
import { canManagePaper } from '@/lib/portal/permissions';
import { readBufferFromGridFS } from '@/lib/portal/gridfs';

function resolveContentType(fileRecord) {
  if (fileRecord?.mimeType) return fileRecord.mimeType;
  const lower = (fileRecord?.filename || fileRecord?.originalName || '').toLowerCase();
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.doc')) {
    return 'application/msword';
  }
  if (lower.endsWith('.zip')) {
    return 'application/zip';
  }
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  return 'application/octet-stream';
}

export async function GET(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get('version');

    await connectDB();

    const paper = await Paper.findById(id).lean();
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
    }

    let isAssignedReviewer = false;
    if (session.role === 'reviewer') {
      const assigned = await Review.findOne({
        paper: id,
        reviewer: session.userId,
      }).lean();
      isAssignedReviewer = !!assigned;
    }

    if (!canManagePaper(session, paper) && !isAssignedReviewer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetVersion = versionParam
      ? parseInt(versionParam, 10)
      : paper.currentVersion;
    const fileRecord =
      (paper.files || []).find((f) => f.version === targetVersion) ||
      (paper.files || [])[paper.files.length - 1];

    if (!fileRecord) {
      return NextResponse.json({ error: 'Manuscript file not found.' }, { status: 404 });
    }

    const safeName = path.basename(fileRecord.filename || fileRecord.originalName || 'manuscript.docx');
    const contentType = resolveContentType(fileRecord);
    let fileBuffer;

    if (fileRecord.storage === 'cloudinary' && fileRecord.url) {
      const cloudRes = await fetch(fileRecord.url);
      if (!cloudRes.ok) {
        return NextResponse.json(
          { error: 'Failed to retrieve file from Cloudinary.' },
          { status: 502 }
        );
      }
      fileBuffer = Buffer.from(await cloudRes.arrayBuffer());
    } else if (fileRecord.storage === 'gridfs' && fileRecord.gridFsId) {
      fileBuffer = await readBufferFromGridFS(fileRecord.gridFsId);
    } else if (fileRecord.filename) {
      const filePath = path.join(process.cwd(), 'uploads', 'papers', safeName);
      fileBuffer = await fs.readFile(filePath);
    } else {
      return NextResponse.json({ error: 'Manuscript file reference missing.' }, { status: 404 });
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    });
  } catch (error) {
    console.error('GET /api/portal/papers/[id]/download error:', error);
    return NextResponse.json(
      { error: 'Failed to download manuscript.' },
      { status: 500 }
    );
  }
}
