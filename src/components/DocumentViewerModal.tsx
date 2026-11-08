'use client';

import { useEffect, useState } from 'react';
import { X, Download, FileText, Calendar } from 'lucide-react';
import { DocumentAttachment } from '@/lib/types';

interface DocumentViewerModalProps {
  document: DocumentAttachment | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentViewerModal({
  document,
  isOpen,
  onClose,
}: DocumentViewerModalProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    if (!isOpen || !document) return;
    const isPreviewable = document.file_type === 'application/pdf' || document.file_type.startsWith('image/');
    if (!isPreviewable) return;

    let active = true;
    let objectUrl = '';
    setPreviewUrl('');
    setPreviewError('');

    fetch(`/api/members/${encodeURIComponent(document.member_id)}/documents/${encodeURIComponent(document.id)}?inline=1`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || 'Could not load document preview.');
        }
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (active) setPreviewError(error instanceof Error ? error.message : 'Could not load document preview.');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document, isOpen]);

  if (!isOpen || !document) return null;

  const isPdf = document.file_type === 'application/pdf';
  const isImage = document.file_type.startsWith('image/');
  const documentUrl = `/api/members/${encodeURIComponent(document.member_id)}/documents/${encodeURIComponent(document.id)}`;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{document.title}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {document.file_name} • {(document.file_size / 1024).toFixed(1)} KB
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={documentUrl}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white py-1.5 px-3 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-900/95 flex items-center justify-center p-4 overflow-auto">
          {isImage ? (
            previewUrl ? (
              <img src={previewUrl} alt={document.title} className="max-h-full max-w-full object-contain rounded-lg shadow-lg" />
            ) : <p className="text-sm text-white">{previewError || 'Loading document preview…'}</p>
          ) : isPdf ? (
            previewUrl ? (
              <iframe src={previewUrl} title={document.title} className="w-full h-full rounded-lg bg-white" />
            ) : <p className="text-sm text-white">{previewError || 'Loading document preview…'}</p>
          ) : (
            <div className="text-center text-white space-y-3">
              <FileText className="w-16 h-16 mx-auto text-slate-400" />
              <p className="text-sm font-medium">Binary / Document File</p>
              <a
                href={documentUrl}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs px-4 py-2 rounded-lg"
              >
                <Download className="w-4 h-4" />
                Download to View ({document.file_name})
              </a>
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
              Category: {document.category}
            </span>
            {document.expiry_date && (
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Valid until: {document.expiry_date}
              </span>
            )}
          </div>
          {document.notes && <p className="italic text-slate-500">Note: {document.notes}</p>}
        </div>
      </div>
    </div>
  );
}
