import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import { verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

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

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string' || !file.name?.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Please upload a valid PDF file.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Revised PDF must be 15 MB or smaller.' },
        { status: 400 }
      );
    }

    const newVersion = (paper.currentVersion || 1) + 1;
    const filename = `${paper.paperId}_v${newVersion}.pdf`;

    const uploadDir = path.join(process.cwd(), 'uploads', 'papers');
    await fs.mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    paper.currentVersion = newVersion;
    paper.files.push({
      version: newVersion,
      filename,
      originalName: file.name,
      uploadedAt: new Date(),
      size: file.size,
    });
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
        filename,
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
