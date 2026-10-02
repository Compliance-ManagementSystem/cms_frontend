import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import type { MasterDataItem } from '@/services/adminService';
import { lookupService } from '@/services/lookupService';
import { complianceRecordService } from '@/services/complianceRecordService';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful upload so the page can reload */
  onUploaded: () => void;
  entityId: string;
  /** Omit to file the document against the entity itself */
  locationId?: string;
  title?: string;
}

const FIELD_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
const FILE_CLASS =
  'w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer';

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  entityId,
  locationId,
  title = 'Upload Document',
}) => {
  const toast = useToast();
  const [docTypes, setDocTypes] = useState<MasterDataItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setName('');
    setDocumentType('');
    setExpiryDate('');
    lookupService
      .getMasterData({ category: 'document_type' })
      .then((res) => setDocTypes(res.items || []))
      .catch(() => setDocTypes([]));
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!name.trim()) {
      toast.error('Document name is required');
      return;
    }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', name.trim());
      form.append('entity', entityId);
      if (locationId) form.append('location', locationId);
      if (documentType) {
        form.append('documentType', documentType);
        const code = docTypes.find((t) => t._id === documentType)?.code;
        if (code) form.append('type', code);
      }
      if (expiryDate) form.append('expiryDate', expiryDate);

      await complianceRecordService.uploadDocument(form);
      toast.success('Document uploaded');
      onUploaded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isUploading}>
            Upload
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>
            File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            required
            onChange={(e) => {
              const selected = e.target.files?.[0] || null;
              setFile(selected);
              if (selected && !name) setName(selected.name.replace(/\.[^/.]+$/, ''));
            }}
            className={FILE_CLASS}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PDF, image, Word, Excel, text or CSV, up to 15 MB</p>
        </div>

        <Input
          label="Document Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Approved floor plan"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS}>Document Type</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={FIELD_CLASS}>
              <option value="">General document</option>
              {docTypes.map((type) => (
                <option key={type._id} value={type._id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Expiry Date</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={FIELD_CLASS} />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default DocumentUploadModal;
