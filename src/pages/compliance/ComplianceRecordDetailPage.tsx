import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  Upload,
  RefreshCw,
  Plus,
  XCircle,
  Pencil,
  Check,
  Send,
  MoreHorizontal,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RecordStatus from '@/components/ui/RecordStatus';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { daysFromToday, formatRelativeDays } from '@/utils/dates';
import {
  complianceRecordService,
  ComplianceRecordItem,
  ComplianceRecordStatus,
  DocumentItem,
  DocumentRequirementItem,
  WorkflowApprovalsResponse,
} from '@/services/complianceRecordService';
import { adminService, MasterDataItem } from '@/services/adminService';
import { lookupService, LookupUser } from '@/services/lookupService';
import { UPLOAD_ACCEPT, checkUploadFile, pickUploadFile } from '@/utils/validation';
import { ROUTES } from '@/constants/routes';
import { getErrorMessage } from '@/utils/errors';
import { usePageTitle } from '@/hooks/usePageTitle';

// The statuses the Location Master sheet uses, in the order work progresses
const SIMPLE_STATUS_OPTIONS: Array<{ value: ComplianceRecordStatus; label: string }> = [
  { value: 'pending', label: 'To be applied' },
  { value: 'in_progress', label: 'Applied' },
  { value: 'approved', label: 'Approved' },
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'expired', label: 'Expired' },
];

// Applied is the 'in_progress' status: it takes the authority's acknowledgement, not licence details
const APPLIED_STATUS: ComplianceRecordStatus = 'in_progress';
// Tag on the uploaded acknowledgement, so the record knows one is already on file
const ACKNOWLEDGEMENT_DOC_TYPE = 'ACKNOWLEDGEMENT';
// Document type (master data code) for the licence uploaded when the status is set to Approved
const LICENCE_DOC_TYPE = 'LICENCE_CERT';

const FIELD_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
const FILE_INPUT_CLASS =
  'block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 dark:file:bg-indigo-500/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100';

// The stages a licence moves through, in order
const STAGES = ['To be applied', 'Ready to apply', 'Applied', 'Approved'] as const;
// Which stage each status sits at
const stageOf = (status: ComplianceRecordStatus): number => {
  if (status === 'pending') return 0;
  if (status === 'ready_to_apply') return 1;
  if (['approved', 'expiring_soon', 'expired'].includes(status)) return 3;
  return 2; // applied, submitted, under review, correction, rejected, resubmitted
};

/** A long file name shortened in the middle, so its end and extension stay readable */
const shortFileName = (name: string, max = 34) =>
  name.length <= max ? name : `${name.slice(0, max - 15)}…${name.slice(-14)}`;

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

// Words too common to say which checklist line a file name belongs to
const MATCH_STOP_WORDS = new Set(['the', 'and', 'for', 'of', 'scan', 'copy', 'final', 'doc', 'document', 'pdf', 'img']);
const matchWords = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !MATCH_STOP_WORDS.has(word));

/**
 * A checklist line for each file: the line sharing most words with the file name,
 * else the next line still missing a document. Each line is offered to one file only.
 */
const guessChecklistLines = (files: File[], requirements: DocumentRequirementItem[]): string[] => {
  const taken = new Set<number>();
  return files.map((file) => {
    const fileWords = new Set(matchWords(file.name));
    let best = -1;
    let bestScore = 0;
    requirements.forEach((requirement, index) => {
      if (taken.has(index)) return;
      const score = matchWords(requirement.label).filter((word) => fileWords.has(word)).length;
      if (score > bestScore) {
        best = index;
        bestScore = score;
      }
    });
    if (best < 0)
      best = requirements.findIndex((requirement, index) => !taken.has(index) && requirement.status === 'missing');
    if (best < 0) return '';
    taken.add(best);
    return String(best);
  });
};

const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`;

export const ComplianceRecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canUpload = can('document', 'upload');
  const canUpdateStatus = can('compliance_record', 'update');
  const canVerify = can('document', 'update');
  const canDeleteDocument = can('document', 'delete');
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
  // Checklist: the open ⋯ menu, files being dragged over the list, the file under review, one being removed
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [docToRemove, setDocToRemove] = useState<DocumentItem | null>(null);
  const [isRemovingDoc, setIsRemovingDoc] = useState(false);

  const [record, setRecord] = useState<ComplianceRecordItem | null>(null);
  usePageTitle(record?.recordNumber);
  const [docTypes, setDocTypes] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // A document whose earlier versions are open
  const [historyDoc, setHistoryDoc] = useState<DocumentItem | null>(null);

  // Document requirements and comment history for this record
  const [workflowData, setWorkflowData] = useState<WorkflowApprovalsResponse | null>(null);

  // Direct status & licence details
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: 'pending' as ComplianceRecordStatus,
    licenceNumber: '',
    acknowledgementNumber: '',
    issueDate: '',
    expiryDate: '',
    comments: '',
  });
  const [acknowledgementFile, setAcknowledgementFile] = useState<File | null>(null);
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Upload Document Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  // Checklist uploads: a file dropped on a line, or several files picked at once
  const [dropLine, setDropLine] = useState<number | null>(null);
  const [uploadingLine, setUploadingLine] = useState<number | null>(null);
  const [bulkFiles, setBulkFiles] = useState<Array<{ file: File; line: string }>>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Replace Document Modal
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replaceTargetDoc, setReplaceTargetDoc] = useState<DocumentItem | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceNotes, setReplaceNotes] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);

  // Preview Document Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState('');
  const [previewDocTitle, setPreviewDocTitle] = useState('');

  // Fetch Record
  const fetchRecord = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setIsLoading(true);
      try {
        const data = await complianceRecordService.getRecordById(id);
        setRecord(data);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load compliance record'));
        navigate(ROUTES.COMPLIANCE_RECORDS);
      } finally {
        setIsLoading(false);
      }
    },
    [id, navigate, toast]
  );

  // People the record can be assigned to: active users of its entity, and those across all entities
  const [assignableUsers, setAssignableUsers] = useState<LookupUser[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const recordEntityId = record?.entity?._id;

  useEffect(() => {
    if (!canUpdateStatus || !recordEntityId) return;
    lookupService
      .getUsers(recordEntityId)
      .then((res) => setAssignableUsers(res.users || []))
      .catch(() => setAssignableUsers([]));
  }, [canUpdateStatus, recordEntityId]);

  const handleAssign = async (userId: string) => {
    if (!id) return;
    setIsAssigning(true);
    try {
      await complianceRecordService.updateRecord(id, { assignedUser: userId });
      toast.success(userId ? 'Record assigned' : 'Assignment removed');
      await fetchRecord(true);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to assign the record'));
    } finally {
      setIsAssigning(false);
    }
  };

  // Fetch document requirements and the comment trail
  const fetchWorkflow = useCallback(async () => {
    if (!id) return;
    try {
      const data = await complianceRecordService.getRecordApprovals(id);
      setWorkflowData(data);
    } catch {
      // Graceful fallback
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
    fetchWorkflow();
  }, [fetchRecord, fetchWorkflow]);

  // The server moves the record to Ready to apply when the last mandatory document lands: say so
  const shownStatus = useRef<ComplianceRecordStatus | undefined>(undefined);
  useEffect(() => {
    if (!record) return;
    if (shownStatus.current === 'pending' && record.status === 'ready_to_apply') {
      toast.success('Every mandatory document is in: this record is now Ready to apply.');
    }
    shownStatus.current = record.status;
  }, [record, toast]);

  // Load prerequisites
  useEffect(() => {
    adminService
      .getMasterData({ category: 'document_type' })
      .then((docsRes) => {
        setDocTypes((docsRes.items || []).filter((i: MasterDataItem) => i.status === 'active'));
      })
      .catch(() => setDocTypes([]));
  }, []);

  const hasAcknowledgementDoc = !!record?.documents?.some((doc) => doc.type === ACKNOWLEDGEMENT_DOC_TYPE);

  const handleOpenStatusModal = () => {
    if (!record) return;
    setStatusForm({
      status: record.status,
      licenceNumber: record.licenceNumber || '',
      acknowledgementNumber: record.acknowledgementNumber || '',
      issueDate: record.issueDate ? record.issueDate.split('T')[0] : '',
      expiryDate: record.expiryDate ? record.expiryDate.split('T')[0] : '',
      comments: '',
    });
    setAcknowledgementFile(null);
    setLicenceFile(null);
    setIsStatusModalOpen(true);
  };

  // Review: the file opens, with Verify and Reject beside it
  const openReview = (doc: DocumentItem) => {
    setReviewDocId(canVerify && doc.verificationStatus === 'pending' ? doc._id : null);
    openPreview(doc);
  };

  const confirmRemoveDocument = async () => {
    if (!docToRemove) return;
    setIsRemovingDoc(true);
    try {
      await complianceRecordService.deleteDocument(docToRemove._id);
      toast.success('Document removed');
      setDocToRemove(null);
      await Promise.all([fetchRecord(true), fetchWorkflow()]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the document'));
    } finally {
      setIsRemovingDoc(false);
    }
  };

  // A ready record's next step: the status window, already set to Applied
  const handleOpenMarkApplied = () => {
    handleOpenStatusModal();
    setStatusForm((prev) => ({ ...prev, status: APPLIED_STATUS }));
  };

  // Verify or reject an uploaded document from its checklist line
  const handleVerifyDocument = async (docId: string, verificationStatus: 'verified' | 'rejected') => {
    setVerifyingDocId(docId);
    try {
      await complianceRecordService.verifyDocument(docId, { verificationStatus });
      toast.success(verificationStatus === 'verified' ? 'Document verified' : 'Document rejected');
      await Promise.all([fetchRecord(true), fetchWorkflow()]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the document'));
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    const isApplied = statusForm.status === APPLIED_STATUS;
    const acknowledgementNumber = statusForm.acknowledgementNumber.trim();

    if (isApplied) {
      if (!acknowledgementNumber) {
        toast.error('Enter the acknowledgement number');
        return;
      }
      if (!acknowledgementFile && !hasAcknowledgementDoc) {
        toast.error('Upload the acknowledgement');
        return;
      }
    } else if (statusForm.issueDate && statusForm.expiryDate && statusForm.expiryDate < statusForm.issueDate) {
      toast.error('The expiry date cannot be before the issue date');
      return;
    }

    setIsSavingStatus(true);
    try {
      // Applied only records the acknowledgement; licence number and dates are left as they are
      const res = await complianceRecordService.updateRecordStatus(
        record._id,
        isApplied
          ? {
              status: statusForm.status,
              acknowledgementNumber,
              comments: statusForm.comments.trim() || undefined,
            }
          : {
              status: statusForm.status,
              licenceNumber: statusForm.licenceNumber.trim(),
              issueDate: statusForm.issueDate || null,
              expiryDate: statusForm.expiryDate || null,
              comments: statusForm.comments.trim() || undefined,
            }
      );

      // The file chosen for the new status is attached to the record once the status is saved
      const licenceNumber = statusForm.licenceNumber.trim();
      const statusUpload =
        isApplied && acknowledgementFile
          ? {
              file: acknowledgementFile,
              label: 'acknowledgement',
              name: `Acknowledgement - ${acknowledgementNumber}`,
              type: ACKNOWLEDGEMENT_DOC_TYPE,
            }
          : statusForm.status === 'approved' && licenceFile
            ? {
                file: licenceFile,
                label: 'licence',
                name: licenceNumber ? `Licence - ${licenceNumber}` : 'Licence',
                type: LICENCE_DOC_TYPE,
              }
            : null;

      if (statusUpload) {
        try {
          const formData = new FormData();
          formData.append('file', statusUpload.file);
          formData.append('name', statusUpload.name);
          formData.append('entity', record.entity._id);
          formData.append('location', record.location._id);
          formData.append('complianceRecord', record._id);
          formData.append('type', statusUpload.type);
          const documentTypeId = docTypes.find((dt) => dt.code === statusUpload.type)?._id;
          if (documentTypeId) formData.append('documentType', documentTypeId);
          await complianceRecordService.uploadDocument(formData);
        } catch (err) {
          toast.error(
            `Status saved, but the ${statusUpload.label} could not be uploaded: ${getErrorMessage(
              err,
              'unknown error'
            )}`
          );
          setIsStatusModalOpen(false);
          await Promise.all([fetchRecord(true), fetchWorkflow()]);
          return;
        }
      }

      toast.success(res.message || 'Record updated');
      setIsStatusModalOpen(false);
      await Promise.all([fetchRecord(true), fetchWorkflow()]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the record'));
    } finally {
      setIsSavingStatus(false);
    }
  };

  // One file onto one checklist line, named after the line it fills
  const uploadToChecklistLine = async (file: File, requirement: DocumentRequirementItem) => {
    if (!record) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', requirement.label);
    formData.append('entity', record.entity._id);
    formData.append('location', record.location._id);
    formData.append('complianceRecord', record._id);
    if (requirement.documentTypeId) formData.append('documentType', requirement.documentTypeId);
    if (requirement.documentTypeCode) formData.append('type', requirement.documentTypeCode);
    await complianceRecordService.uploadDocument(formData);
  };

  // Files picked or dropped together go to the matching window, each already guessed to a line
  const startBulkUpload = (files: File[], preferredLine?: number) => {
    const accepted = files.filter((file) => {
      const problem = checkUploadFile(file);
      if (problem) toast.error(problem);
      return !problem;
    });
    if (accepted.length === 0) return;
    const lines = guessChecklistLines(accepted, documentRequirements);
    // Dropped on a line, the first file belongs to that line
    if (preferredLine !== undefined) {
      const clash = lines.indexOf(String(preferredLine));
      if (clash > 0) lines[clash] = lines[0];
      lines[0] = String(preferredLine);
    }
    setBulkFiles(accepted.map((file, index) => ({ file, line: lines[index] })));
  };

  const handleDropOnLine = async (e: React.DragEvent, requirement: DocumentRequirementItem, index: number) => {
    e.preventDefault();
    setDropLine(null);
    if (!canUpload || uploadingLine !== null) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    if (files.length > 1) {
      startBulkUpload(files, index);
      return;
    }
    const problem = checkUploadFile(files[0]);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploadingLine(index);
    try {
      await uploadToChecklistLine(files[0], requirement);
      toast.success(`Uploaded to "${requirement.label}"`);
      await Promise.all([fetchRecord(true), fetchWorkflow()]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload document'));
    } finally {
      setUploadingLine(null);
    }
  };

  const confirmBulkUpload = async () => {
    const chosen = bulkFiles.filter((item) => item.line !== '');
    if (chosen.length === 0) {
      toast.error('Choose a checklist line for at least one file');
      return;
    }
    setIsBulkUploading(true);
    let uploaded = 0;
    const failed: string[] = [];
    // One at a time, so the record moves to Ready to apply only once, after the last one
    for (const item of chosen) {
      try {
        await uploadToChecklistLine(item.file, documentRequirements[Number(item.line)]);
        uploaded++;
      } catch (err) {
        failed.push(`${item.file.name}: ${getErrorMessage(err, 'upload failed')}`);
      }
    }
    setIsBulkUploading(false);
    if (uploaded > 0) toast.success(`${uploaded} ${uploaded === 1 ? 'document' : 'documents'} uploaded`);
    failed.forEach((message) => toast.error(message));
    if (failed.length === 0) setBulkFiles([]);
    else setBulkFiles((prev) => prev.filter((item) => failed.some((message) => message.startsWith(item.file.name))));
    await Promise.all([fetchRecord(true), fetchWorkflow()]);
  };

  const openUploadFor = (requirement: DocumentRequirementItem) => {
    setUploadDocType(requirement.documentTypeId || '');
    setUploadDocName(requirement.label);
    setUploadFile(null);
    setIsUploadModalOpen(true);
  };

  // Handle Document Upload Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || !uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadDocName.trim() || uploadFile.name);
      formData.append('entity', record.entity._id);
      formData.append('location', record.location._id);
      formData.append('complianceRecord', record._id);
      if (uploadDocType) {
        formData.append('documentType', uploadDocType);
        const typeCode = docTypes.find((dt) => dt._id === uploadDocType)?.code;
        if (typeCode) formData.append('type', typeCode);
      }
      if (uploadExpiryDate) formData.append('expiryDate', uploadExpiryDate);

      const res = await complianceRecordService.uploadDocument(formData);
      toast.success(res.message || 'Document uploaded successfully');
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadDocName('');
      setUploadDocType('');
      setUploadExpiryDate('');
      fetchRecord(true);
      fetchWorkflow();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload document'));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Document Replacement (New Version)
  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTargetDoc || !replaceFile) {
      toast.error('Please select a replacement file');
      return;
    }

    setIsReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', replaceFile);
      if (replaceNotes) formData.append('notes', replaceNotes.trim());

      const res = await complianceRecordService.replaceDocument(replaceTargetDoc._id, formData);
      toast.success(res.message || 'New document version created');
      setIsReplaceModalOpen(false);
      setReplaceFile(null);
      setReplaceNotes('');
      fetchRecord(true);
      fetchWorkflow();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to replace document version'));
    } finally {
      setIsReplacing(false);
    }
  };

  // Open Preview Modal
  const openPreview = async (doc: DocumentItem, version?: number) => {
    try {
      const blob = await complianceRecordService.fetchDocumentFile(doc._id, { version, inline: true });
      setPreviewDocUrl(URL.createObjectURL(blob));
      setPreviewDocTitle(`${doc.name} (v${version || doc.currentVersion || 1})`);
      setIsPreviewModalOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load document preview'));
    }
  };

  const closePreview = () => {
    setIsPreviewModalOpen(false);
    if (previewDocUrl) URL.revokeObjectURL(previewDocUrl);
    setPreviewDocUrl('');
  };

  // Trigger Download
  const handleDownload = async (docId: string, fileName: string, version?: number) => {
    try {
      const blob = await complianceRecordService.fetchDocumentFile(docId, { version });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to download document'));
    }
  };

  if (isLoading || !record) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading compliance tracking details...</p>
        </div>
      </div>
    );
  }

  // Render Status Badge
  const renderStatusBadge = (status: ComplianceRecordStatus) => <RecordStatus status={status} size="md" />;

  const documentRequirements = workflowData?.documentRequirements || [];
  const showChecklist = documentRequirements.length > 0 && record.status !== 'not_applicable';
  // Relative expiry hint
  const expiryDays = record.expiryDate ? daysFromToday(record.expiryDate) : null;

  // Who wrote the comment currently stored on the record
  const latestCommentSource = (workflowData?.approvals || []).find((a) => a.comments && a.comments === record.comments);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header: what the licence is, where it stands, and what to do next */}
      <Card className="p-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(ROUTES.COMPLIANCE_RECORDS)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {record.rule?.name || 'Compliance Obligation'}
                </h1>
                {renderStatusBadge(record.status)}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">
                  {record.recordNumber}
                </span>
                <span>•</span>
                {record.licenceNumber && (
                  <>
                    <span className="text-slate-600 dark:text-slate-300">
                      Licence no. <span className="font-mono font-semibold">{record.licenceNumber}</span>
                    </span>
                    <span>•</span>
                  </>
                )}
                {record.acknowledgementNumber && (
                  <>
                    <span className="text-slate-600 dark:text-slate-300">
                      Ack. no. <span className="font-mono font-semibold">{record.acknowledgementNumber}</span>
                    </span>
                    <span>•</span>
                  </>
                )}
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Building2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                  {record.entity?.name}
                </span>
                <span>•</span>
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <MapPin size={13} className="text-emerald-600 dark:text-emerald-400" />
                  {record.location?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Acknowledgement and licence are uploaded here; other documents from the Documents tab */}
          <div className="flex flex-wrap items-center gap-2">
            {canUpdateStatus && (
              <Button variant="outline" leftIcon={<Pencil size={15} />} onClick={handleOpenStatusModal}>
                Update Status
              </Button>
            )}
            {canUpdateStatus && record.status === 'ready_to_apply' && (
              <Button variant="primary" leftIcon={<Send size={15} />} onClick={handleOpenMarkApplied}>
                Mark as Applied
              </Button>
            )}
          </div>
        </div>

        {/* ── Where the licence stands: one step per stage ── */}
        {record.status !== 'not_applicable' &&
          (() => {
            const current = stageOf(record.status);
            const expired = record.status === 'expired';
            const sentBack = ['rejected', 'correction'].includes(record.status);
            return (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <ol className="flex items-start">
                  {STAGES.map((stage, index) => {
                    const done = index < current || (index === current && current === 3 && !expired);
                    const here = index === current && !done;
                    const warn = here && (expired || sentBack);
                    const label = index === 3 && expired ? 'Expired' : index === 2 && sentBack ? 'Sent back' : stage;
                    return (
                      <li key={stage} className="flex-1 flex flex-col items-center relative min-w-0">
                        {/* The line from the previous step */}
                        {index > 0 && (
                          <span
                            className={`absolute top-3 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                              index <= current ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        )}
                        <span
                          className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            done
                              ? 'bg-emerald-500 text-white'
                              : warn
                                ? 'bg-rose-500 text-white ring-[3px] ring-rose-500/20'
                                : here
                                  ? `${index === 1 ? 'bg-cyan-500' : index === 2 ? 'bg-indigo-500' : 'bg-amber-500'} text-white ring-[3px] ${
                                      index === 1
                                        ? 'ring-cyan-500/20'
                                        : index === 2
                                          ? 'ring-indigo-500/20'
                                          : 'ring-amber-500/20'
                                    }`
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {done ? <Check size={13} strokeWidth={3} /> : warn ? <XCircle size={13} /> : index + 1}
                        </span>
                        <span
                          className={`mt-2 text-xs text-center px-1 ${
                            here
                              ? warn
                                ? 'font-bold text-rose-600 dark:text-rose-400'
                                : 'font-bold text-slate-900 dark:text-white'
                              : done
                                ? 'font-medium text-slate-700 dark:text-slate-300'
                                : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {label}
                        </span>
                        {here && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center px-1">
                            {index === 0
                              ? 'Collect the documents below'
                              : index === 1
                                ? 'File it with the authority'
                                : index === 2
                                  ? sentBack
                                    ? 'Correct and resubmit'
                                    : 'Waiting on the authority'
                                  : 'Renew to continue'}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })()}
      </Card>

      <div className="space-y-6">
        {/* The work on the left; the facts and history beside it */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Documents: the checklist the licence needs, then anything else on file */}
            <Card className="relative p-0 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div
                onDragEnter={(e: React.DragEvent) => {
                  if (canUpload && showChecklist && e.dataTransfer.types.includes('Files')) setIsDraggingFiles(true);
                }}
                onDragLeave={(e: React.DragEvent) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsDraggingFiles(false);
                    setDropLine(null);
                  }
                }}
                onDrop={() => setIsDraggingFiles(false)}
              >
                {(() => {
                  const required = documentRequirements.filter((r) => r.isMandatory);
                  const optional = documentRequirements.filter((r) => !r.isMandatory);
                  const uploaded = required.filter((r) => r.status === 'pending' || r.status === 'verified').length;
                  const verified = required.filter((r) => r.status === 'verified').length;
                  // Files that fill no checklist line: the acknowledgement, the licence, anything else
                  const onChecklist = new Set(documentRequirements.flatMap((r) => r.documents.map((d) => d._id)));
                  const otherDocs = (record.documents || []).filter((d) => !showChecklist || !onChecklist.has(d._id));

                  const STATUS: Record<DocumentRequirementItem['status'], { word: string; dot: string; text: string }> =
                    {
                      missing: {
                        word: 'Missing',
                        dot: 'border border-slate-400 dark:border-slate-500',
                        text: 'text-slate-500 dark:text-slate-400',
                      },
                      pending: { word: 'To review', dot: 'bg-amber-500', text: 'text-slate-700 dark:text-slate-300' },
                      verified: {
                        word: 'Verified',
                        dot: 'bg-emerald-500',
                        text: 'text-emerald-700 dark:text-emerald-400',
                      },
                      rejected: { word: 'Rejected', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400' },
                    };
                  const GRID =
                    'grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_6.5rem_auto] items-center gap-4 px-5 py-3 text-sm';

                  // Everything about a file beyond its one main action
                  const docMenu = (doc: DocumentItem, menuKey: string) => (
                    <span className="relative">
                      <button
                        type="button"
                        aria-label={`More actions for ${doc.name}`}
                        onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenu === menuKey && (
                        <>
                          <span className="fixed inset-0 z-20" onClick={() => setOpenMenu(null)} />
                          <span className="absolute right-0 top-full mt-1 z-30 w-44 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg text-sm">
                            {[
                              { label: 'View', show: true, act: () => openPreview(doc) },
                              {
                                label: 'Replace file',
                                show: canUpload,
                                act: () => {
                                  setReplaceTargetDoc(doc);
                                  setIsReplaceModalOpen(true);
                                },
                              },
                              { label: 'Download', show: true, act: () => handleDownload(doc._id, doc.fileName) },
                              {
                                label: `Version history (${doc.versions?.length || 1})`,
                                show: (doc.versions?.length || 0) > 1,
                                act: () => setHistoryDoc(doc),
                              },
                              {
                                label: 'Remove',
                                show: canDeleteDocument,
                                act: () => setDocToRemove(doc),
                                danger: true,
                              },
                            ]
                              .filter((item) => item.show)
                              .map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => {
                                    setOpenMenu(null);
                                    item.act();
                                  }}
                                  className={`block w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                    item.danger
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                          </span>
                        </>
                      )}
                    </span>
                  );

                  const fileCell = (doc?: DocumentItem, extra = 0) =>
                    doc ? (
                      <span
                        className="flex items-baseline gap-1.5 min-w-0 text-xs text-slate-500 dark:text-slate-400"
                        title={doc.fileName}
                      >
                        <span className="truncate">{shortFileName(doc.fileName)}</span>
                        <span className="shrink-0 tabular-nums">· {formatFileSize(doc.fileSize)}</span>
                        {extra > 0 && <span className="shrink-0">· +{extra}</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    );

                  const lineRow = (req: DocumentRequirementItem) => {
                    const index = documentRequirements.indexOf(req);
                    const latest = req.documents[req.documents.length - 1];
                    const doc = latest ? record.documents?.find((d) => d._id === latest._id) : undefined;
                    const status = STATUS[req.status];
                    return (
                      <li
                        key={`${req.documentTypeId}-${index}`}
                        onDragOver={(e) => {
                          if (!canUpload) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                          if (dropLine !== index) setDropLine(index);
                        }}
                        onDrop={(e) => handleDropOnLine(e, req, index)}
                        className={`relative ${GRID} transition-colors ${
                          dropLine === index
                            ? 'bg-cyan-50 dark:bg-cyan-900/20'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        {/* While files are held over the list: where each one can go */}
                        {isDraggingFiles && (
                          <span
                            className={`pointer-events-none absolute inset-1 rounded-md border-2 border-dashed ${
                              dropLine === index ? 'border-cyan-500' : 'border-slate-200 dark:border-slate-700'
                            }`}
                          />
                        )}
                        <span
                          className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100"
                          title={req.label}
                        >
                          {req.label}
                        </span>
                        {uploadingLine === index ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-cyan-700 dark:text-cyan-300">
                            <RefreshCw size={12} className="animate-spin" /> Uploading…
                          </span>
                        ) : (
                          fileCell(doc, req.documents.length - 1)
                        )}
                        <span className={`inline-flex items-center gap-2 text-xs font-medium ${status.text}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                          {status.word}
                        </span>
                        <span className="flex items-center justify-end gap-1">
                          {req.status === 'missing' || req.status === 'rejected'
                            ? canUpload && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openUploadFor(req)}
                                  className="min-w-[76px]"
                                >
                                  Upload
                                </Button>
                              )
                            : doc && (
                                <Button
                                  variant={req.status === 'pending' && canVerify ? 'outline' : 'ghost'}
                                  size="sm"
                                  onClick={() => openReview(doc)}
                                  className="min-w-[76px]"
                                >
                                  {req.status === 'pending' && canVerify ? 'Review' : 'View'}
                                </Button>
                              )}
                          {doc ? docMenu(doc, `line-${index}`) : <span className="w-[28px]" />}
                        </span>
                      </li>
                    );
                  };

                  const otherRow = (doc: DocumentItem) => (
                    <li key={doc._id} className={`${GRID} hover:bg-slate-50/70 dark:hover:bg-slate-800/30`}>
                      <span
                        className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100"
                        title={doc.name}
                      >
                        {doc.name}
                      </span>
                      {fileCell(doc)}
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(doc.uploadedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openPreview(doc)} className="min-w-[76px]">
                          View
                        </Button>
                        {docMenu(doc, `doc-${doc._id}`)}
                      </span>
                    </li>
                  );

                  const section = (title: string, items: React.ReactNode[], action?: React.ReactNode) => (
                    <section>
                      <div className="flex items-center justify-between gap-3 px-5 py-2 bg-slate-50 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {title}
                        </span>
                        {action}
                      </div>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">{items}</ul>
                    </section>
                  );

                  return (
                    <>
                      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {showChecklist
                              ? `${uploaded} of ${required.length} required uploaded · ${verified} verified`
                              : record.status === 'not_applicable'
                                ? 'Not applicable to this unit, so no documents are required'
                                : `${otherDocs.length} on file`}
                          </p>
                        </div>
                        {canUpload && showChecklist && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Upload size={13} />}
                              onClick={() => bulkInputRef.current?.click()}
                            >
                              Upload files
                            </Button>
                            <input
                              ref={bulkInputRef}
                              type="file"
                              multiple
                              accept={UPLOAD_ACCEPT}
                              className="hidden"
                              onChange={(e) => {
                                startBulkUpload(Array.from(e.target.files || []));
                                e.target.value = '';
                              }}
                            />
                          </>
                        )}
                      </div>

                      {/* One segment per required document: grey missing, amber to review, green verified */}
                      {showChecklist && (
                        <div className="flex gap-1 px-5 pb-4">
                          {required.map((req, i) => (
                            <span
                              key={i}
                              title={`${req.label}: ${STATUS[req.status].word}`}
                              className={`h-1 flex-1 rounded-full ${
                                req.status === 'verified'
                                  ? 'bg-emerald-500'
                                  : req.status === 'pending'
                                    ? 'bg-amber-400'
                                    : req.status === 'rejected'
                                      ? 'bg-rose-500'
                                      : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {showChecklist && required.length > 0 && section('Required', required.map(lineRow))}
                      {showChecklist && optional.length > 0 && section('Optional', optional.map(lineRow))}
                      {(otherDocs.length > 0 || canUpload) &&
                        section(
                          'Other documents',
                          otherDocs.length > 0
                            ? otherDocs.map(otherRow)
                            : [
                                <li key="none" className="px-5 py-3 text-xs text-slate-400 dark:text-slate-500">
                                  Acknowledgements, licences and any other files appear here.
                                </li>,
                              ],
                          canUpload && (
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('');
                                setUploadDocName('');
                                setUploadFile(null);
                                setIsUploadModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                            >
                              <Plus size={12} /> Add
                            </button>
                          )
                        )}
                      <div className="h-2" />
                    </>
                  );
                })()}
              </div>
            </Card>
          </div>

          <aside className="space-y-6 min-w-0">
            {/* Summary: the facts that matter at this stage */}
            <Card className="p-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800">
                Summary
              </h3>
              <dl className="mt-3 space-y-2.5 text-xs">
                {(() => {
                  type Fact = { label: string; value: string; tone?: string; hint?: string; node?: React.ReactNode };
                  const facts: Fact[] = [];
                  if (stageOf(record.status) === 3) {
                    facts.push(
                      {
                        label: 'Approved on',
                        value: record.approvalDate
                          ? new Date(record.approvalDate).toLocaleDateString()
                          : 'Not recorded',
                      },
                      {
                        label: 'Expires on',
                        value: record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : '—',
                        hint: record.expiryDate
                          ? expiryDays! < 0
                            ? `expired ${formatRelativeDays(record.expiryDate)}`
                            : formatRelativeDays(record.expiryDate)
                          : undefined,
                        tone:
                          expiryDays !== null && expiryDays < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : expiryDays !== null && expiryDays <= 30
                              ? 'text-amber-600 dark:text-amber-400'
                              : undefined,
                      },
                      { label: 'Licence no.', value: record.licenceNumber || '—' }
                    );
                  } else {
                    const mandatory = documentRequirements.filter((r) => r.isMandatory);
                    const met = mandatory.filter((r) => r.status === 'pending' || r.status === 'verified').length;
                    if (showChecklist && mandatory.length > 0) {
                      facts.push({
                        label: 'Documents',
                        value: `${met} / ${mandatory.length}`,
                        tone:
                          met === mandatory.length
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : 'text-amber-600 dark:text-amber-400',
                      });
                    }
                    const dueDays = record.dueDate ? daysFromToday(record.dueDate) : null;
                    facts.push({
                      label: 'Due date',
                      value: record.dueDate ? new Date(record.dueDate).toLocaleDateString() : 'Not set',
                      hint:
                        dueDays === null
                          ? undefined
                          : dueDays < 0
                            ? `overdue by ${Math.abs(dueDays)}d`
                            : `${dueDays}d left`,
                      tone:
                        dueDays !== null && dueDays < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : dueDays !== null && dueDays <= 7
                            ? 'text-amber-600 dark:text-amber-400'
                            : undefined,
                    });
                  }
                  const assignee = record.assignedUser
                    ? record.assignedUser.fullName || `${record.assignedUser.firstName} ${record.assignedUser.lastName}`
                    : '';
                  facts.push(
                    {
                      label: 'Assigned to',
                      value: assignee || 'No one yet',
                      tone: assignee ? undefined : 'text-slate-400 dark:text-slate-500',
                      node: canUpdateStatus ? (
                        <select
                          aria-label="Assigned to"
                          value={record.assignedUser?._id || ''}
                          onChange={(e) => handleAssign(e.target.value)}
                          disabled={isAssigning}
                          className="w-full max-w-[14rem] -my-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        >
                          <option value="">No one yet</option>
                          {record.assignedUser && !assignableUsers.some((u) => u._id === record.assignedUser?._id) && (
                            <option value={record.assignedUser._id}>{assignee}</option>
                          )}
                          {assignableUsers.map((u) => (
                            <option key={u._id} value={u._id}>
                              {`${u.firstName} ${u.lastName}`.trim()}
                              {u.role?.name ? ` · ${u.role.name}` : ''}
                            </option>
                          ))}
                        </select>
                      ) : undefined,
                    },
                    {
                      label: 'Open for',
                      value: `${daysSince(record.createdAt)} days`,
                      hint: `since ${new Date(record.createdAt).toLocaleDateString()}`,
                    }
                  );
                  return facts.map((fact) => (
                    <div key={fact.label} className="grid grid-cols-[6.5rem_1fr] gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">{fact.label}</dt>
                      <dd className={`min-w-0 font-semibold ${fact.tone || 'text-slate-800 dark:text-slate-200'}`}>
                        {fact.node ?? fact.value}
                        {fact.hint && (
                          <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">{fact.hint}</span>
                        )}
                      </dd>
                    </div>
                  ));
                })()}
              </dl>
            </Card>

            {/* Details: the licence, who holds it and where */}
            <Card className="p-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800">
                Details
              </h3>
              <dl className="mt-3 space-y-3 text-xs">
                {[
                  { label: 'Licence', value: record.rule?.name, sub: record.rule?.code },
                  { label: 'Category', value: record.rule?.category?.label || 'General' },
                  {
                    label: 'Renewal',
                    value: `${record.rule?.frequency?.label || 'Annual'} · every ${record.rule?.renewalCycle || 365} days`,
                  },
                  ...(record.rule?.legalReference
                    ? [{ label: 'Act / section', value: record.rule.legalReference }]
                    : []),
                  { label: 'Company', value: record.entity?.name, sub: record.entity?.entityCode },
                  { label: 'Unit', value: record.location?.name, sub: record.location?.locationCode },
                  { label: 'COM', value: record.location?.com || 'Not assigned' },
                  ...(record.location?.cluster ? [{ label: 'Cluster', value: record.location.cluster }] : []),
                  {
                    label: 'Address',
                    value:
                      [record.location?.address?.city, record.location?.address?.state].filter(Boolean).join(', ') ||
                      '—',
                  },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-[6.5rem_1fr] gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">{row.label}</dt>
                    <dd className="min-w-0 text-slate-800 dark:text-slate-200 font-medium break-words">
                      {row.value || '—'}
                      {row.sub && row.sub !== row.value && (
                        <span className="block font-mono font-normal text-[11px] text-slate-500 dark:text-slate-400">
                          {row.sub}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              {record.comments && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="text-slate-500 dark:text-slate-400 mb-1">Latest comment</div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60">
                    {record.comments}
                  </div>
                  {latestCommentSource && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {latestCommentSource.performedBy?.fullName ||
                        latestCommentSource.performedBy?.email ||
                        'Reviewer'}{' '}
                      · {new Date(latestCommentSource.performedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>

      {/* ── Remove a document from the checklist ─────────────────────────────── */}
      <Modal
        isOpen={!!docToRemove}
        onClose={() => !isRemovingDoc && setDocToRemove(null)}
        title="Remove document"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={isRemovingDoc} onClick={() => setDocToRemove(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isRemovingDoc} onClick={confirmRemoveDocument}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Remove <span className="font-semibold">{docToRemove?.name}</span> from this record? It is archived, not
          destroyed, and stays in the history. A required document removed takes the record back to To be applied.
        </p>
      </Modal>

      {/* ── Earlier versions of one document ─────────────────────────────────── */}
      <Modal
        isOpen={!!historyDoc}
        onClose={() => setHistoryDoc(null)}
        title={`Versions: ${historyDoc?.name || ''}`}
        size="md"
      >
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 -mt-2">
          {[...(historyDoc?.versions || [])]
            .sort((a, b) => b.version - a.version)
            .map((v) => (
              <li key={v._id || v.version} className="flex items-center justify-between gap-3 py-3 text-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 w-8 shrink-0">
                    v{v.version}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="truncate" title={v.fileName}>
                        {shortFileName(v.fileName, 40)}
                      </span>
                      {v.status === 'active' && (
                        <span className="shrink-0 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatFileSize(v.fileSize)} · {v.uploadedBy?.fullName || v.uploadedBy?.email || 'User'} ·{' '}
                      {new Date(v.uploadedAt).toLocaleString()}
                      {v.notes ? ` · "${v.notes}"` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => historyDoc && openPreview(historyDoc, v.version)}>
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => historyDoc && handleDownload(historyDoc._id, v.fileName, v.version)}
                  >
                    Download
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      </Modal>

      {/* ── Several checklist files at once ──────────────────────────────────── */}
      <Modal
        isOpen={bulkFiles.length > 0}
        onClose={() => !isBulkUploading && setBulkFiles([])}
        title="Upload to the checklist"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={isBulkUploading} onClick={() => setBulkFiles([])}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isBulkUploading} onClick={confirmBulkUpload}>
              Upload {bulkFiles.filter((item) => item.line !== '').length} of {bulkFiles.length}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Each file is matched to a checklist line by its name. Change any that are wrong, or choose "Skip" to leave a
          file out.
        </p>
        <ul className="space-y-2">
          {bulkFiles.map((item, index) => {
            // A line already chosen for another file is shown, but marked
            const takenElsewhere = new Set(bulkFiles.filter((_, other) => other !== index).map((other) => other.line));
            return (
              <li
                key={`${item.file.name}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2 min-w-0 sm:w-2/5">
                  <FileText size={16} className="shrink-0 text-sky-600 dark:text-sky-400" />
                  <div className="min-w-0">
                    <div
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate"
                      title={item.file.name}
                    >
                      {item.file.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(item.file.size)}</div>
                  </div>
                </div>
                <select
                  value={item.line}
                  disabled={isBulkUploading}
                  onChange={(e) =>
                    setBulkFiles((prev) =>
                      prev.map((entry, other) => (other === index ? { ...entry, line: e.target.value } : entry))
                    )
                  }
                  className={`${FIELD_CLASS} sm:flex-1 py-2`}
                >
                  <option value="">Skip this file</option>
                  {documentRequirements.map((requirement, line) => (
                    <option key={line} value={String(line)}>
                      {requirement.label}
                      {requirement.status !== 'missing' ? ' (already uploaded)' : ''}
                      {takenElsewhere.has(String(line)) ? ' (also chosen above)' : ''}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </Modal>

      {/* ── Upload Document Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Statutory Evidence Document"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadSubmit} isLoading={isUploading}>
              Upload File
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Select Document File *
            </label>
            <input
              type="file"
              required
              accept={UPLOAD_ACCEPT}
              onChange={(e) => {
                const f = pickUploadFile(e, toast.error);
                if (f) {
                  setUploadFile(f);
                  if (!uploadDocName) setUploadDocName(f.name.replace(/\.[^/.]+$/, ''));
                }
              }}
              className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            />
          </div>

          <div>
            <Input
              label="Document Name / Label *"
              value={uploadDocName}
              onChange={(e) => setUploadDocName(e.target.value)}
              placeholder="e.g. Pollution Clearance Certificate"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Document Type (Master Data)
            </label>
            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">-- General Document --</option>
              {docTypes.map((dt) => (
                <option key={dt._id} value={dt._id}>
                  {dt.label} ({dt.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Document Expiry Date"
              type="date"
              value={uploadExpiryDate}
              onChange={(e) => setUploadExpiryDate(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* ── Replace Document Modal (New Version) ─────────────────────────────── */}
      <Modal
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        title={`Upload New Version for "${replaceTargetDoc?.name}"`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsReplaceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReplaceSubmit} isLoading={isReplacing}>
              Upload New Revision
            </Button>
          </div>
        }
      >
        <form onSubmit={handleReplaceSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            A new version (<strong>v{(replaceTargetDoc?.currentVersion || 1) + 1}</strong>) will be created. The current
            version will be archived into historical records and will <strong>never be destroyed</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Replacement File *
            </label>
            <input
              type="file"
              required
              accept={UPLOAD_ACCEPT}
              onChange={(e) => setReplaceFile(pickUploadFile(e, toast.error))}
              className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Revision Notes
            </label>
            <textarea
              rows={2}
              value={replaceNotes}
              onChange={(e) => setReplaceNotes(e.target.value)}
              placeholder="e.g. Renewed certificate for subsequent statutory period"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 resize-none shadow-sm dark:shadow-none"
            />
          </div>
        </form>
      </Modal>

      {/* ── Preview Document Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setReviewDocId(null);
          closePreview();
        }}
        title={reviewDocId ? `Review: ${previewDocTitle}` : `Preview: ${previewDocTitle}`}
        size="xl"
        footer={
          reviewDocId ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Check the file, then verify it or send it back.
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={verifyingDocId !== null}
                  onClick={async () => {
                    await handleVerifyDocument(reviewDocId, 'rejected');
                    setReviewDocId(null);
                    closePreview();
                  }}
                  className="!text-rose-600 dark:!text-rose-400"
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Check size={15} />}
                  isLoading={verifyingDocId === reviewDocId}
                  disabled={verifyingDocId !== null}
                  onClick={async () => {
                    await handleVerifyDocument(reviewDocId, 'verified');
                    setReviewDocId(null);
                    closePreview();
                  }}
                >
                  Verify
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="h-[550px] w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
          <iframe src={previewDocUrl} title={previewDocTitle} className="w-full h-full border-0" />
        </div>
      </Modal>

      {/* ── Status & Licence Details Modal ───────────────────────────────────── */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Status"
        description="Set where this licence stands and record the details from the certificate."
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={isSavingStatus} onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isSavingStatus} onClick={handleSaveStatus}>
              Save
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="record-status">
              Status
            </label>
            <select
              id="record-status"
              value={statusForm.status}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value as ComplianceRecordStatus }))}
              className={FIELD_CLASS}
            >
              {/* Keep a status from the approval route selectable until it is changed */}
              {!SIMPLE_STATUS_OPTIONS.some((option) => option.value === record.status) && (
                <option value={record.status}>
                  {record.status === 'ready_to_apply'
                    ? 'Ready to apply (set automatically)'
                    : record.status.replace(/_/g, ' ')}
                </option>
              )}
              {SIMPLE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {statusForm.status === APPLIED_STATUS ? (
            <>
              <Input
                label="Acknowledgement Number"
                value={statusForm.acknowledgementNumber}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, acknowledgementNumber: e.target.value }))}
                placeholder="As printed on the acknowledgement"
                required
              />

              <div>
                <label className={LABEL_CLASS} htmlFor="record-acknowledgement-file">
                  Upload Acknowledgement{!hasAcknowledgementDoc && ' *'}
                </label>
                <input
                  id="record-acknowledgement-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setAcknowledgementFile(pickUploadFile(e, toast.error))}
                  className={FILE_INPUT_CLASS}
                />
                {acknowledgementFile ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {acknowledgementFile.name} ({formatFileSize(acknowledgementFile.size)})
                  </p>
                ) : (
                  hasAcknowledgementDoc && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      An acknowledgement is already on file. Upload a file only to add another.
                    </p>
                  )
                )}
              </div>
            </>
          ) : (
            <>
              <Input
                label="Licence / Registration Number"
                value={statusForm.licenceNumber}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, licenceNumber: e.target.value }))}
                placeholder="As printed on the certificate"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS} htmlFor="record-issue-date">
                    Issue Date
                  </label>
                  <input
                    id="record-issue-date"
                    type="date"
                    value={statusForm.issueDate}
                    onChange={(e) => setStatusForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS} htmlFor="record-expiry-date">
                    Expiry Date
                  </label>
                  <input
                    id="record-expiry-date"
                    type="date"
                    value={statusForm.expiryDate}
                    onChange={(e) => setStatusForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
              {statusForm.status === 'approved' && (
                <div>
                  <label className={LABEL_CLASS} htmlFor="record-licence-file">
                    Upload Licence
                  </label>
                  <input
                    id="record-licence-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setLicenceFile(e.target.files?.[0] || null)}
                    className={FILE_INPUT_CLASS}
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {licenceFile
                      ? `${licenceFile.name} (${formatFileSize(licenceFile.size)})`
                      : "Optional. The licence certificate, added to the record's documents."}
                  </p>
                </div>
              )}
              {statusForm.status === 'approved' && record.status !== 'approved' && !statusForm.expiryDate && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No expiry date entered
                  {record.rule?.renewalCycle
                    ? `: it will be set to ${record.rule.renewalCycle} days from today. Enter the date on the certificate if it differs.`
                    : ', so no renewal reminder will be raised.'}
                </p>
              )}
            </>
          )}

          <div>
            <label className={LABEL_CLASS} htmlFor="record-status-remarks">
              Remarks
            </label>
            <textarea
              id="record-status-remarks"
              rows={3}
              value={statusForm.comments}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, comments: e.target.value }))}
              placeholder={
                statusForm.status === 'not_applicable' ? 'Why this licence does not apply to the unit' : 'Optional'
              }
              className={FIELD_CLASS}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ComplianceRecordDetailPage;
