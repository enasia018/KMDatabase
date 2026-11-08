import type { DocumentCategory } from './types';

export const MAX_DOCUMENT_SIZE = 8 * 1024 * 1024;
export const MAX_DOCUMENT_REQUEST_SIZE = 11 * 1024 * 1024;

export class DocumentUploadError extends Error {}

export class DocumentRequestTooLargeError extends Error {}

const allowedTypes: Record<string, { extension: string; signature: (bytes: Buffer) => boolean }> = {
  'application/pdf': {
    extension: '.pdf',
    signature: (bytes) => bytes.subarray(0, 5).toString('ascii') === '%PDF-',
  },
  'image/jpeg': {
    extension: '.jpg',
    signature: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  'image/png': {
    extension: '.png',
    signature: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  'image/webp': {
    extension: '.webp',
    signature: (bytes) => bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  'image/gif': {
    extension: '.gif',
    signature: (bytes) => ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii')),
  },
};

const allowedCategories: DocumentCategory[] = [
  'OR_CR',
  'FRANCHISE_PERMIT',
  'DRIVER_LICENSE',
  'INSURANCE',
  'VALID_ID',
  'PAYMENT_RECEIPT',
  'MEMBERSHIP_CONTRACT',
  'OTHER',
];

export interface ValidatedDocumentUpload {
  title: string;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  file_data: string;
  expiry_date?: string;
  notes?: string;
}

export function sanitizeDocumentName(name: string, mimeType: string): string {
  const allowedType = allowedTypes[mimeType];
  const leafName = name.split(/[\\/]/).pop() || 'document';
  const stem = leafName.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9 _.-]/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 100) || 'document';
  return `${stem}${allowedType.extension}`;
}

export async function readDocumentFormData(request: Request): Promise<FormData> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_DOCUMENT_REQUEST_SIZE) {
    throw new DocumentRequestTooLargeError();
  }
  if (!request.body) throw new DocumentUploadError('Choose a non-empty PDF or image file.');

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let totalSize = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalSize += value.byteLength;
    if (totalSize > MAX_DOCUMENT_REQUEST_SIZE) {
      await reader.cancel();
      throw new DocumentRequestTooLargeError();
    }
    chunks.push(Buffer.from(value));
  }

  const body = Buffer.concat(chunks);
  try {
    const formRequest = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': request.headers.get('content-type') || '' },
      body,
    });
    return await formRequest.formData();
  } catch {
    throw new DocumentUploadError('Invalid document upload form data.');
  }
}

export async function validateDocumentUpload(formData: FormData): Promise<ValidatedDocumentUpload> {
  const file = formData.get('file');
  const titleValue = formData.get('title');
  const categoryValue = formData.get('category');
  const expiryValue = formData.get('expiry_date');
  const notesValue = formData.get('notes');

  if (!(file instanceof File) || file.size === 0) {
    throw new DocumentUploadError('Choose a non-empty PDF or image file.');
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new DocumentUploadError(`Files must be ${MAX_DOCUMENT_SIZE / 1024 / 1024} MB or smaller.`);
  }
  if (typeof titleValue !== 'string' || !titleValue.trim() || titleValue.trim().length > 160) {
    throw new DocumentUploadError('Document title is required and must be 160 characters or fewer.');
  }
  if (typeof categoryValue !== 'string' || !allowedCategories.includes(categoryValue as DocumentCategory)) {
    throw new DocumentUploadError('Choose a valid document category.');
  }
  if (expiryValue !== null && typeof expiryValue !== 'string') {
    throw new DocumentUploadError('Invalid expiry date.');
  }
  if (typeof expiryValue === 'string' && expiryValue &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(expiryValue) ||
       Number.isNaN(Date.parse(`${expiryValue}T00:00:00Z`)) ||
       new Date(`${expiryValue}T00:00:00Z`).toISOString().slice(0, 10) !== expiryValue)) {
    throw new DocumentUploadError('Expiry date must be a valid calendar date.');
  }
  if (notesValue !== null && (typeof notesValue !== 'string' || notesValue.length > 1000)) {
    throw new DocumentUploadError('Notes must be 1000 characters or fewer.');
  }

  const mimeType = file.type.toLowerCase();
  const allowedType = allowedTypes[mimeType];
  if (!allowedType) {
    throw new DocumentUploadError('Only PDF, JPEG, PNG, GIF, and WebP files are supported.');
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!allowedType.signature(bytes)) {
    throw new DocumentUploadError('The file contents do not match the selected file type.');
  }

  return {
    title: titleValue.trim(),
    category: categoryValue as DocumentCategory,
    file_name: sanitizeDocumentName(file.name, mimeType),
    file_type: mimeType,
    file_size: bytes.length,
    file_data: `data:${mimeType};base64,${bytes.toString('base64')}`,
    ...(typeof expiryValue === 'string' && expiryValue ? { expiry_date: expiryValue } : {}),
    ...(typeof notesValue === 'string' && notesValue.trim() ? { notes: notesValue.trim() } : {}),
  };
}
