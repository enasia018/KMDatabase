import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateDocumentUpload } from '../src/lib/document-upload.ts';

function uploadForm({
  bytes = Buffer.from('%PDF-1.7\nsample'),
  name = 'document.pdf',
  type = 'application/pdf',
  title = 'Registration document',
} = {}) {
  const formData = new FormData();
  formData.set('file', new File([bytes], name, { type }));
  formData.set('title', title);
  formData.set('category', 'OTHER');
  return formData;
}

test('accepts a PDF and sanitizes the client-supplied filename', async () => {
  const document = await validateDocumentUpload(uploadForm({ name: '..\\private\\registration.pdf' }));

  assert.equal(document.file_type, 'application/pdf');
  assert.equal(document.file_name, 'registration.pdf');
  assert.equal(document.file_size, Buffer.byteLength('%PDF-1.7\nsample'));
  assert.match(document.file_data, /^data:application\/pdf;base64,/);
});

test('rejects file contents that do not match the declared MIME type', async () => {
  await assert.rejects(
    validateDocumentUpload(uploadForm({ bytes: Buffer.from('not a PDF') })),
    /file contents do not match/
  );
});

test('rejects unsupported MIME types', async () => {
  await assert.rejects(
    validateDocumentUpload(uploadForm({ type: 'image/svg+xml', name: 'document.svg' })),
    /Only PDF, JPEG, PNG, GIF, and WebP/
  );
});

test('rejects files larger than 8 MB', async () => {
  await assert.rejects(
    validateDocumentUpload(uploadForm({ bytes: Buffer.alloc(8 * 1024 * 1024 + 1) })),
    /8 MB or smaller/
  );
});

test('rejects invalid titles and expiry dates', async () => {
  await assert.rejects(validateDocumentUpload(uploadForm({ title: '  ' })), /Document title is required/);

  const invalidDate = uploadForm();
  invalidDate.set('expiry_date', '2025-02-29');
  await assert.rejects(validateDocumentUpload(invalidDate), /valid calendar date/);
});
