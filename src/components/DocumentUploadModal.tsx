'use client';

import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Camera, Clipboard, Image as ImageIcon } from 'lucide-react';
import { DocumentCategory, Unit } from '@/lib/types';

interface DocumentUploadModalProps {
  memberId: string;
  units?: Unit[];
  isOpen: boolean;
  initialCategory?: DocumentCategory;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DocumentUploadModal({
  memberId,
  units = [],
  isOpen,
  initialCategory = 'OR_CR',
  onClose,
  onSuccess,
}: DocumentUploadModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPasting, setIsPasting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: initialCategory,
    unit_id: units[0]?.id || '',
    expiry_date: '',
    notes: '',
  });

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewUrl('');
      setFormData({
        title: '',
        category: initialCategory,
        unit_id: units[0]?.id || '',
        expiry_date: '',
        notes: '',
      });
    }
  }, [initialCategory, isOpen, units]);

  // Listen for clipboard paste (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            if (blob.size > 8 * 1024 * 1024) {
              alert('File size exceeds the 8 MB limit. Please upload a compressed image.');
              break;
            }
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
            const customFile = new File([blob], `Screenshot_${dateStr}_${timeStr}.png`, {
              type: blob.type || 'image/png',
            });

            setFile(customFile);
            setIsPasting(true);
            setTimeout(() => setIsPasting(false), 2000);

            setPreviewUrl(URL.createObjectURL(customFile));

            if (!formData.title) {
              setFormData((prev) => ({
                ...prev,
                title: `${prev.category === 'OR_CR' ? 'OR/CR of Van' : prev.category === 'PAYMENT_RECEIPT' ? 'Resibo / Payment Receipt' : 'Signed Document Screenshot'} - ${dateStr}`,
              }));
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, formData.title, formData.category]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 8 * 1024 * 1024) {
      alert('File size exceeds the 8 MB limit. Please upload a compressed document.');
      return;
    }

    setFile(selected);
    setPreviewUrl(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : '');
    if (!formData.title) {
      setFormData((prev) => ({
        ...prev,
        title: selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      }));
    }

  };

  const setCategoryQuick = (cat: DocumentCategory, defaultLabel: string) => {
    setFormData((prev) => ({
      ...prev,
      category: cat,
      title: prev.title ? prev.title : defaultLabel,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please choose a file or paste a screenshot (Ctrl+V).');
      return;
    }
    setLoading(true);

    try {
      const uploadData = new FormData();
      uploadData.set('file', file);
      uploadData.set('title', formData.title);
      uploadData.set('category', formData.category);
      uploadData.set('unit_id', formData.unit_id);
      uploadData.set('expiry_date', formData.expiry_date);
      uploadData.set('notes', formData.notes);
      const res = await fetch(`/api/members/${memberId}/documents`, {
        method: 'POST',
        body: uploadData,
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Could not upload document. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Attach Document or Screenshot
              </h3>
              <p className="text-xs text-slate-500">
                Resibo, OR/CR of van, signed documents, or license
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Quick Category Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quick Document Type:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryQuick('OR_CR', 'OR and CR of Van')}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                  formData.category === 'OR_CR'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🚐 OR & CR of Van
              </button>

              <button
                type="button"
                onClick={() => setCategoryQuick('PAYMENT_RECEIPT', 'Resibo / Payment Receipt')}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                  formData.category === 'PAYMENT_RECEIPT'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🧾 Resibo / Receipt
              </button>

              <button
                type="button"
                onClick={() => setCategoryQuick('MEMBERSHIP_CONTRACT', 'Signed Affiliation Contract')}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                  formData.category === 'MEMBERSHIP_CONTRACT'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ✍️ Signed Documents
              </button>

              <button
                type="button"
                onClick={() => setCategoryQuick('DRIVER_LICENSE', "Driver's License")}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                  formData.category === 'DRIVER_LICENSE'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🪪 Driver's License
              </button>

              <button
                type="button"
                onClick={() => setCategoryQuick('INSURANCE', 'Vehicle Insurance / TPL')}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                  formData.category === 'INSURANCE'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🛡️ Insurance
              </button>
            </div>
          </div>

          {/* Interactive Upload & Paste Zone */}
          <div className="border-2 border-dashed border-sky-300 rounded-xl p-4 text-center hover:border-sky-500 transition-colors bg-sky-50/30 relative">
            <input
              type="file"
              id="file-upload-input"
              accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer block space-y-2">
              {previewUrl ? (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-hidden rounded-lg mx-auto inline-block border border-slate-200 shadow-sm">
                    <img
                      src={previewUrl}
                      alt="Document Preview"
                      className="max-h-48 object-contain"
                    />
                  </div>
                  <p className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {file?.name} ({(file!.size / 1024).toFixed(1)} KB)
                  </p>
                  <p className="text-[11px] text-slate-400">Click to replace or paste another</p>
                </div>
              ) : file ? (
                <div className="space-y-1 py-3">
                  <FileText className="w-10 h-10 text-sky-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  <p className="text-[11px] text-slate-400">Click to change file</p>
                </div>
              ) : (
                <div className="py-3 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sky-600">
                    <Camera className="w-7 h-7" />
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to Browse File / Take Photo
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Or press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px] font-bold">Ctrl + V</kbd> anywhere on screen to paste screenshot directly!
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Supports PDF, JPEG, PNG, GIF, and WebP files up to 8 MB
                  </p>
                </div>
              )}
            </label>

            {isPasting && (
              <div className="absolute inset-0 bg-emerald-600/90 rounded-xl flex items-center justify-center text-white font-bold text-sm animate-fade-in">
                📋 Screenshot pasted from clipboard!
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Label / Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2026 LTO OR/CR - NDO 4821 or November Resibo"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as DocumentCategory })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              >
                <option value="OR_CR">OR / CR of Van (Vehicle Registration)</option>
                <option value="PAYMENT_RECEIPT">Resibo / Proof of Payment (GCash/Bank/Cash)</option>
                <option value="MEMBERSHIP_CONTRACT">Signed Documents & Affiliation Contract</option>
                <option value="DRIVER_LICENSE">Driver's License (Lisensya)</option>
                <option value="FRANCHISE_PERMIT">LTFRB Franchise Permit / CPC</option>
                <option value="INSURANCE">Comprehensive / Passenger Insurance</option>
                <option value="VALID_ID">Government Valid ID (PhilSys/Passport)</option>
                <option value="OTHER">Other Document / Attachment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date (Optional, for renewal alert)
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>

            {units.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tag to Specific Van Unit (Optional)
                </label>
                <select
                  value={formData.unit_id}
                  onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-500"
                >
                  <option value="">-- General Member Document --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_name} — Plate: {u.plate_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Signed contract original on file, OR valid until Feb 2027"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm disabled:opacity-50 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              {loading ? 'Attaching Document...' : 'Save & Attach to Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
