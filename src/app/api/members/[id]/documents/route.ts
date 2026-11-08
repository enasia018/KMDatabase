import { NextResponse } from 'next/server';
import { createDocument, getMemberById, getMemberDocuments } from '@/lib/db';
import {
  DocumentRequestTooLargeError,
  DocumentUploadError,
  readDocumentFormData,
  validateDocumentUpload,
} from '@/lib/document-upload';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const member = await getMemberById(id);
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    return NextResponse.json(await getMemberDocuments(id));
  } catch (error) {
    console.error('Could not load member documents:', error);
    return NextResponse.json({ error: 'Could not load member documents' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const member = await getMemberById(id);
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const formData = await readDocumentFormData(request);
    const upload = await validateDocumentUpload(formData);
    const unitId = formData.get('unit_id');
    if (unitId !== null && typeof unitId !== 'string') {
      return NextResponse.json({ error: 'Invalid vehicle selection.' }, { status: 400 });
    }
    if (typeof unitId === 'string' && unitId &&
        !(member.units || []).some((unit) => unit.id === unitId)) {
      return NextResponse.json({ error: 'Selected vehicle does not belong to this member.' }, { status: 400 });
    }

    const document = await createDocument({
      ...upload,
      member_id: id,
      ...(typeof unitId === 'string' && unitId ? { unit_id: unitId } : {}),
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentRequestTooLargeError) {
      return NextResponse.json({ error: 'Upload request is too large; maximum file size is 8 MB.' }, { status: 413 });
    }
    if (error instanceof DocumentUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Could not save member document:', error);
    return NextResponse.json({ error: 'Could not save member document' }, { status: 500 });
  }
}
