import { NextResponse } from 'next/server';
import { verifyPortalSession } from '@/lib/portal/session';
import { isCloudinaryConfigured, signCloudinaryUpload } from '@/lib/portal/cloudinary';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['submitter', 'admin'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Only submitters can upload manuscripts.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const filename = (body?.filename || '').toString().trim();
    const size = Number(body?.size || 0);

    const lower = filename.toLowerCase();
    if (
      !filename ||
      (!lower.endsWith('.docx') &&
        !lower.endsWith('.doc') &&
        !lower.endsWith('.doc.zip'))
    ) {
      return NextResponse.json(
        { error: 'Only .doc or .docx manuscript files are accepted.' },
        { status: 400 }
      );
    }

    if (size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds 10 MB limit after compression.' },
        { status: 400 }
      );
    }

    if (isCloudinaryConfigured()) {
      const ext = lower.endsWith('.doc.zip')
        ? '.doc.zip'
        : lower.endsWith('.docx')
          ? '.docx'
          : '.doc';
      const publicId = `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const signed = signCloudinaryUpload({
        folder: 'wisdom-portal/papers',
        publicId,
      });
      return NextResponse.json({ mode: 'cloudinary', ...signed });
    }

    return NextResponse.json({ mode: 'gridfs' });
  } catch (error) {
    console.error('POST /api/portal/uploads/sign error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare upload.' },
      { status: 500 }
    );
  }
}
