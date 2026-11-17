import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Edit2,
  Trash2,
  Upload,
  ExternalLink,
  ShieldCheck,
  XCircle,
  Stethoscope,
} from 'lucide-react';
import { z } from 'zod';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import FieldError from '@/components/ui/FieldError';
import { useToast } from '@/hooks/useToast';
import {
  manpowerService,
  LocationManpower,
  ManpowerRole,
  StaffMember,
  StaffDocumentLine,
  StaffDocumentState,
} from '@/services/manpowerService';
import { complianceRecordService } from '@/services/complianceRecordService';
import { openDocumentInNewTab } from '@/utils/documentFile';
import { getErrorMessage } from '@/utils/errors';
import {
  MAX_UPLOAD_MB,
  UPLOAD_ACCEPT,
  getServerFieldErrors,
  maxLength,
  optionalPhone,
  pickUploadFile,
  required,
  useFormErrors,
} from '@/utils/validation';

interface ManpowerTabProps {
  locationId: string;
  canEdit: boolean;
  canUpload: boolean;
  canVerify: boolean;
  /** Called after any change so the page can refresh its readiness badge */
  onChanged: () => void;
}

const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
const FIELD_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const FILE_CLASS =
  'w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer';

const STATE_BADGE: Record<
  StaffDocumentState,
  { label: string; variant: 'danger' | 'pending' | 'success' | 'expired' }
> = {
  missing: { label: 'Missing', variant: 'danger' },
  pending: { label: 'Uploaded', variant: 'pending' },
  verified: { label: 'Verified', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  expired: { label: 'Expired', variant: 'expired' },
};

const staffSchema = z.object({
  name: required('Name').max(120, 'Name must be at most 120 characters'),
  qualification: maxLength('Qualification', 120),
  registrationNumber: maxLength('Registration number', 60),
  phone: optionalPhone,
});

const toDateInput = (value?: string) => (value ? value.slice(0, 10) : '');

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '');

// ── Add / edit staff ──────────────────────────────────────────────────────────

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  locationId: string;
  role: ManpowerRole;
  roleLabel: string;
  staff: StaffMember | null;
}

const StaffModal: React.FC<StaffModalProps> = ({ isOpen, onClose, onSaved, locationId, role, roleLabel, staff }) => {
  const toast = useToast();
  const [values, setValues] = useState({
    name: '',
    qualification: '',
    registrationNumber: '',
    phone: '',
    joiningDate: '',
  });
  const [serverErrors, setServerErrors] = useState<Record<string, string>>();
  const { errors, validate, clear, setErrors } = useFormErrors(serverErrors);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValues({
      name: staff?.name || '',
      qualification: staff?.qualification || '',
      registrationNumber: staff?.registrationNumber || '',
      phone: staff?.phone || '',
      joiningDate: toDateInput(staff?.joiningDate),
    });
    setErrors({});
  }, [isOpen, staff, setErrors]);

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    clear(field);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(staffSchema, values)) return;
    setIsSaving(true);
    try {
      const payload = { ...values, name: values.name.trim() };
      if (staff) {
        await manpowerService.updateStaff(staff._id, payload);
        toast.success(`${payload.name} updated`);
      } else {
        await manpowerService.createStaff(locationId, { ...payload, role });
        toast.success(`${roleLabel} added`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerErrors(getServerFieldErrors(err));
      toast.error(getErrorMessage(err, 'Failed to save staff member'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={staff ? `Edit ${roleLabel}` : `Add ${roleLabel}`}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSaving}>
            {staff ? 'Save' : 'Add'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full Name"
          name="name"
          required
          value={values.name}
          onChange={set('name')}
          error={errors.name}
          placeholder={role === 'DOCTOR' ? 'e.g. Dr. Anita Sharma' : 'e.g. Priya Das'}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Qualification"
            name="qualification"
            value={values.qualification}
            onChange={set('qualification')}
            error={errors.qualification}
            placeholder={role === 'DOCTOR' ? 'e.g. MBBS, MD' : role === 'NURSE' ? 'e.g. GNM' : 'e.g. DMLT'}
          />
          <Input
            label="Registration No."
            name="registrationNumber"
            value={values.registrationNumber}
            onChange={set('registrationNumber')}
            error={errors.registrationNumber}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" name="phone" value={values.phone} onChange={set('phone')} error={errors.phone} />
          <Input
            label="Joining Date"
            name="joiningDate"
            type="date"
            value={values.joiningDate}
            onChange={set('joiningDate')}
            error={errors.joiningDate}
          />
        </div>
      </form>
    </Modal>
  );
};

// ── Upload one required document ─────────────────────────────────────────────

interface UploadTarget {
  staff: StaffMember;
  line: StaffDocumentLine;
}

const UploadModal: React.FC<{ target: UploadTarget | null; onClose: () => void; onUploaded: () => void }> = ({
  target,
  onClose,
  onUploaded,
}) => {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [fileError, setFileError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!target) return;
    setFile(null);
    setFileError('');
    setExpiryDate('');
  }, [target]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!file) {
      setFileError('Choose a file to upload');
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('requirement', target.line.requirement._id);
      if (expiryDate) form.append('expiryDate', expiryDate);
      await manpowerService.uploadStaffDocument(target.staff._id, form);
      toast.success(`${target.line.requirement.label} uploaded`);
      onUploaded();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload document'));
    } finally {
      setIsUploading(false);
    }
  };

  const replacing = !!target?.line.document;

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title={replacing ? 'Replace Document' : 'Upload Document'}
      description={target ? `${target.line.requirement.label} for ${target.staff.name}` : undefined}
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
            accept={UPLOAD_ACCEPT}
            onChange={(e) => {
              setFile(pickUploadFile(e, toast.error));
              setFileError('');
            }}
            className={FILE_CLASS}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            PDF only, up to {MAX_UPLOAD_MB} MB
          </p>
          <FieldError message={fileError} />
        </div>
        <div>
          <label className={LABEL_CLASS}>Valid Until</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={FIELD_CLASS}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            For registrations that need renewing. Leave empty if the document does not expire.
          </p>
        </div>
        {replacing && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The current file is kept in the document&apos;s version history.
          </p>
        )}
      </form>
    </Modal>
  );
};

// ── Tab ───────────────────────────────────────────────────────────────────────

const ManpowerTab: React.FC<ManpowerTabProps> = ({ locationId, canEdit, canUpload, canVerify, onChanged }) => {
  const toast = useToast();
  const [data, setData] = useState<LocationManpower | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [staffModal, setStaffModal] = useState<{ role: ManpowerRole; staff: StaffMember | null } | null>(null);
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [staffToRemove, setStaffToRemove] = useState<StaffMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [busyDocument, setBusyDocument] = useState<string | null>(null);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await manpowerService.getLocationManpower(locationId));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load manpower'));
    } finally {
      setIsLoading(false);
    }
  }, [locationId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged();
  };

  const roleLabel = (role: ManpowerRole) => data?.roles.find((r) => r.code === role)?.label || role;

  const handleRemove = async () => {
    if (!staffToRemove) return;
    setIsRemoving(true);
    try {
      await manpowerService.removeStaff(staffToRemove._id);
      toast.success(`${staffToRemove.name} removed`);
      setStaffToRemove(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove staff member'));
    } finally {
      setIsRemoving(false);
    }
  };

  const handleVerify = async (documentId: string, verificationStatus: 'verified' | 'rejected') => {
    setBusyDocument(documentId);
    try {
      await complianceRecordService.verifyDocument(documentId, { verificationStatus });
      toast.success(verificationStatus === 'verified' ? 'Document verified' : 'Document rejected');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update document'));
    } finally {
      setBusyDocument(null);
    }
  };

  const handleView = (documentId: string) => {
    openDocumentInNewTab(documentId).catch((err) => toast.error(getErrorMessage(err, 'Failed to open document')));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">Manpower could not be loaded.</p>
    );
  }

  const { status } = data;
  const visibleIssues = showAllIssues ? status.issues : status.issues.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Readiness */}
      <Card
        padding="lg"
        className={
          status.ready
            ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/10'
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex items-start gap-3">
            {status.ready ? (
              <CheckCircle2 size={26} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle size={26} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {status.ready ? 'Ready for licence application' : 'Not ready for licence application'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Needs at least {data.minPerRole} of each role below, and every listed document for each staff member.
              </p>
              {!status.ready && (
                <ul className="mt-3 space-y-1 text-sm text-rose-700 dark:text-rose-300">
                  {visibleIssues.map((issue) => (
                    <li key={issue} className="flex gap-2">
                      <span aria-hidden>•</span>
                      {issue}
                    </li>
                  ))}
                  {status.issues.length > 6 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setShowAllIssues((v) => !v)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {showAllIssues ? 'Show less' : `Show all ${status.issues.length}`}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {status.roles.map((role) => {
              const ok = role.staffCount >= data.minPerRole && role.completeCount === role.staffCount;
              return (
                <div
                  key={role.role}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 min-w-[130px]"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {role.label}
                  </div>
                  <div
                    className={`text-sm font-semibold mt-0.5 ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {role.staffCount === 0 ? 'None added' : `${role.completeCount} of ${role.staffCount} complete`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* One section per role */}
      {data.roles.map(({ code, label }) => {
        const members = data.staff.filter((member) => member.role === code);
        return (
          <div key={code} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Stethoscope size={18} className="text-emerald-600 dark:text-emerald-400" />
                {label}
                <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {members.length}
                </span>
              </h3>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<UserPlus size={14} />}
                  onClick={() => setStaffModal({ role: code, staff: null })}
                >
                  Add {label}
                </Button>
              )}
            </div>

            {members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rose-300 dark:border-rose-900/60 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No {label} added yet. At least {data.minPerRole} is needed.
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member._id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{member.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3">
                        {member.qualification && <span>{member.qualification}</span>}
                        {member.registrationNumber && <span>Reg. {member.registrationNumber}</span>}
                        {member.phone && <span>{member.phone}</span>}
                        {member.joiningDate && <span>Joined {formatDate(member.joiningDate)}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit2 size={13} />}
                          onClick={() => setStaffModal({ role: member.role, staff: member })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 size={13} />}
                          className="text-rose-600 dark:text-rose-400"
                          onClick={() => setStaffToRemove(member)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>

                  {member.documents.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                      No documents are required of a {label} yet.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {member.documents.map((line) => {
                          const badge = STATE_BADGE[line.state];
                          const doc = line.document;
                          return (
                            <tr key={line.requirement._id}>
                              <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">
                                {line.requirement.label}
                                {!line.requirement.isMandatory && (
                                  <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">Optional</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <Badge variant={badge.variant} size="sm" dot={line.state !== 'missing'}>
                                  {badge.label}
                                </Badge>
                                {line.expiringSoon && (
                                  <Badge variant="warning" size="sm" className="ml-1.5">
                                    Expires soon
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {doc?.expiryDate ? `Valid until ${formatDate(doc.expiryDate)}` : doc ? 'No expiry' : ''}
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <div className="inline-flex gap-1">
                                  {doc && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      leftIcon={<ExternalLink size={13} />}
                                      onClick={() => handleView(doc._id)}
                                    >
                                      View
                                    </Button>
                                  )}
                                  {doc && canVerify && line.state === 'pending' && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<ShieldCheck size={13} />}
                                        className="text-emerald-600 dark:text-emerald-400"
                                        disabled={busyDocument === doc._id}
                                        onClick={() => handleVerify(doc._id, 'verified')}
                                      >
                                        Verify
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<XCircle size={13} />}
                                        className="text-rose-600 dark:text-rose-400"
                                        disabled={busyDocument === doc._id}
                                        onClick={() => handleVerify(doc._id, 'rejected')}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {canUpload && (
                                    <Button
                                      variant={doc ? 'ghost' : 'outline'}
                                      size="sm"
                                      leftIcon={<Upload size={13} />}
                                      onClick={() => setUploadTarget({ staff: member, line })}
                                    >
                                      {doc ? 'Replace' : 'Upload'}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })}

      {staffModal && (
        <StaffModal
          isOpen
          onClose={() => setStaffModal(null)}
          onSaved={refresh}
          locationId={locationId}
          role={staffModal.role}
          roleLabel={roleLabel(staffModal.role)}
          staff={staffModal.staff}
        />
      )}

      <UploadModal target={uploadTarget} onClose={() => setUploadTarget(null)} onUploaded={refresh} />

      <Modal
        isOpen={!!staffToRemove}
        onClose={() => setStaffToRemove(null)}
        title="Remove Staff Member"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStaffToRemove(null)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} isLoading={isRemoving}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Remove <strong>{staffToRemove?.name}</strong> from this location? Their uploaded documents are kept, but they
          will no longer count towards readiness.
        </p>
      </Modal>
    </div>
  );
};

export default ManpowerTab;
