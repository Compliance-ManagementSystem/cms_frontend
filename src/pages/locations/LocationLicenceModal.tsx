import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import type { MasterDataItem } from '@/services/adminService';
import { lookupService } from '@/services/lookupService';
import { licenceService, LicenceItem, LicencePayload } from '@/services/licenceService';

interface LocationLicenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful save so the page can reload */
  onSaved: () => void;
  locationId: string;
  /** Pre-fills the issuing state for a new licence */
  locationState?: string;
  /** When set, the dialog edits this licence instead of adding one */
  licence?: LicenceItem | null;
}

const FIELD_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
const FILE_CLASS =
  'w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer';

const emptyForm = (state = '') => ({
  licenceType: '',
  licenceNumber: '',
  issuingAuthority: '',
  issuingState: state,
  issueDate: '',
  expiryDate: '',
  status: 'active' as NonNullable<LicencePayload['status']>,
  notes: '',
});

const LocationLicenceModal: React.FC<LocationLicenceModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  locationId,
  locationState,
  licence,
}) => {
  const toast = useToast();
  const isEditing = !!licence;

  const [licenceTypes, setLicenceTypes] = useState<MasterDataItem[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setForm(
      licence
        ? {
            licenceType: licence.licenceType?._id || '',
            licenceNumber: licence.licenceNumber,
            issuingAuthority: licence.issuingAuthority || '',
            issuingState: licence.issuingState || '',
            issueDate: licence.issueDate ? licence.issueDate.slice(0, 10) : '',
            expiryDate: licence.expiryDate ? licence.expiryDate.slice(0, 10) : '',
            // "expired" is worked out from the date, so it is not a choice here
            status: licence.status === 'expired' ? 'active' : licence.status,
            notes: licence.notes || '',
          }
        : emptyForm(locationState)
    );
    lookupService
      .getMasterData({ category: 'licence_type' })
      .then((res) => setLicenceTypes(res.items || []))
      .catch(() => setLicenceTypes([]));
  }, [isOpen, licence, locationState]);

  const set = (field: keyof ReturnType<typeof emptyForm>) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const willRenew =
    isEditing && !!licence?.expiryDate && !!form.expiryDate && form.expiryDate > licence.expiryDate.slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.licenceType || !form.licenceNumber.trim() || !form.issuingAuthority.trim()) {
      toast.error('Licence type, number and issuing authority are required');
      return;
    }
    if (!form.issueDate || !form.expiryDate) {
      toast.error('Issue date and expiry date are required');
      return;
    }
    if (form.expiryDate <= form.issueDate) {
      toast.error('Expiry date must be after the issue date');
      return;
    }

    const payload: LicencePayload = {
      licenceType: form.licenceType,
      licenceNumber: form.licenceNumber.trim(),
      issuingAuthority: form.issuingAuthority.trim(),
      issuingState: form.issuingState.trim(),
      issueDate: form.issueDate,
      expiryDate: form.expiryDate,
      status: form.status,
      notes: form.notes.trim(),
    };

    setIsSaving(true);
    try {
      const res = licence
        ? await licenceService.updateLicence(licence._id, payload, file)
        : await licenceService.createLicence(locationId, payload, file);
      toast.success(res.message);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save licence');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Licence' : 'Add Licence'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Add Licence'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS}>
              Licence Type <span className="text-red-500">*</span>
            </label>
            <select required value={form.licenceType} onChange={set('licenceType')} className={FIELD_CLASS}>
              <option value="">Select licence type</option>
              {licenceTypes.map((type) => (
                <option key={type._id} value={type._id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Licence Number"
            required
            value={form.licenceNumber}
            onChange={set('licenceNumber')}
            placeholder="e.g. FSSAI-2026-MH-0012345"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Issuing Authority"
            required
            value={form.issuingAuthority}
            onChange={set('issuingAuthority')}
            placeholder="e.g. Maharashtra Fire Services"
          />
          <Input label="Issuing State" value={form.issuingState} onChange={set('issuingState')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL_CLASS}>
              Issue Date <span className="text-red-500">*</span>
            </label>
            <input type="date" required value={form.issueDate} onChange={set('issueDate')} className={FIELD_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.expiryDate}
              min={form.issueDate || undefined}
              onChange={set('expiryDate')}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Status</label>
            <select value={form.status} onChange={set('status')} className={FIELD_CLASS}>
              <option value="active">Active</option>
              <option value="pending_renewal">Pending renewal</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {willRenew && (
          <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-600/40 rounded-lg px-3 py-2">
            The expiry date is later than before, so this will be recorded as a renewal.
          </p>
        )}

        <div>
          <label className={LABEL_CLASS}>Certificate File</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className={FILE_CLASS} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {licence?.document
              ? `Current file: ${licence.document.fileName} (v${licence.document.currentVersion}). Choosing a file adds a new version; earlier versions are kept.`
              : 'Optional. PDF, image, Word, Excel, text or CSV, up to 15 MB.'}
          </p>
        </div>

        <div>
          <label className={LABEL_CLASS}>Notes</label>
          <textarea rows={2} value={form.notes} onChange={set('notes')} className={`${FIELD_CLASS} resize-none`} />
        </div>
      </form>
    </Modal>
  );
};

export default LocationLicenceModal;
