import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  Calendar,
  User,
  FileText,
  Upload,
  Download,
  Eye,
  RefreshCw,
  CheckCircle2,
  History,
  Plus,
  XCircle,
  Pencil,
  Files,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
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

  const [record, setRecord] = useState<ComplianceRecordItem | null>(null);
  usePageTitle(record?.recordNumber);
  const [docTypes, setDocTypes] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview');
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

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
  const renderStatusBadge = (status: ComplianceRecordStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="success" size="md">
            APPROVED
          </Badge>
        );
      case 'submitted':
        return (
          <Badge variant="info" size="md">
            SUBMITTED
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="info" size="md">
            UNDER REVIEW
          </Badge>
        );
      case 'correction':
        return (
          <Badge variant="warning" size="md">
            NEEDS CORRECTION
          </Badge>
        );
      case 'resubmitted':
        return (
          <Badge variant="info" size="md">
            RESUBMITTED
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge variant="warning" size="md">
            EXPIRING SOON
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="danger" size="md">
            EXPIRED
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="md">
            REJECTED
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="info" size="md">
            APPLIED
          </Badge>
        );
      case 'ready_to_apply':
        return (
          <Badge variant="ready" size="md" dot>
            READY TO APPLY
          </Badge>
        );
      case 'not_applicable':
        return (
          <Badge variant="default" size="md">
            NOT APPLICABLE
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="warning" size="md">
            TO BE APPLIED
          </Badge>
        );
    }
  };

  const documentRequirements = workflowData?.documentRequirements || [];
  // Relative expiry hint
  const expiryDays = record.expiryDate ? daysFromToday(record.expiryDate) : null;

  // Who wrote the comment currently stored on the record
  const latestCommentSource = (workflowData?.approvals || []).find((a) => a.comments && a.comments === record.comments);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
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
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ClipboardCheck size={16} />
          Overview & Dates
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText size={16} />
          Documents ({record.documents?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Approved
              </div>
              <div
                className={`text-lg font-bold mt-1 ${
                  record.approvalDate ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {record.approvalDate ? new Date(record.approvalDate).toLocaleDateString() : 'Not yet'}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {record.approvalDate ? formatRelativeDays(record.approvalDate) : 'Not approved yet'}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar size={14} />
                Expiry Date
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : '—'}
              </div>
              <div
                className={`text-[11px] mt-1 ${
                  expiryDays !== null && expiryDays < 0
                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                    : expiryDays !== null && expiryDays <= 30
                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
                      : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {!record.expiryDate
                  ? 'Not entered yet'
                  : expiryDays! < 0
                    ? `Expired ${formatRelativeDays(record.expiryDate)}`
                    : `Expires ${formatRelativeDays(record.expiryDate)}`}
              </div>
              {record.issueDate && (
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Issued {new Date(record.issueDate).toLocaleDateString()}
                </div>
              )}
            </Card>
          </div>

          {/* Required Documents Checklist; a not applicable record needs none */}
          {documentRequirements.length > 0 && record.status !== 'not_applicable' && (
            <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Required Documents</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {documentRequirements.filter((r) => r.status !== 'missing').length} of {documentRequirements.length}{' '}
                    uploaded
                    {' · '}
                    {documentRequirements.filter((r) => r.status === 'verified').length} verified
                  </span>
                  {canUpload && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Files size={13} />}
                        onClick={() => bulkInputRef.current?.click()}
                      >
                        Upload several files
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
              </div>
              {canUpload && (
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                  Tip: drag a file from your computer onto a line below to upload it there.
                </p>
              )}

              {/* How close the record is to Ready to apply: only mandatory documents count */}
              {(() => {
                const mandatory = documentRequirements.filter((r) => r.isMandatory);
                const met = mandatory.filter((r) => r.status === 'pending' || r.status === 'verified').length;
                const left = mandatory.length - met;
                const share = mandatory.length > 0 ? (met / mandatory.length) * 100 : 0;
                const waitingToFile = ['pending', 'ready_to_apply'].includes(record.status);
                return (
                  <div
                    className={`rounded-lg p-3 border ${
                      left === 0
                        ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span
                        className={`flex items-center gap-1.5 font-semibold ${
                          left === 0 ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {left === 0 && <CheckCircle2 size={14} />}
                        {left === 0
                          ? waitingToFile
                            ? 'Ready to apply: every mandatory document is in'
                            : 'Every mandatory document is in'
                          : `${left} mandatory ${left === 1 ? 'document' : 'documents'} to go before this is ready to apply`}
                      </span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {met} / {mandatory.length} mandatory
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white dark:bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${left === 0 ? 'bg-cyan-500' : 'bg-amber-400'}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                {documentRequirements.map((req, idx) => (
                  <div
                    key={`${req.documentTypeId}-${idx}`}
                    onDragOver={(e) => {
                      if (!canUpload) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      if (dropLine !== idx) setDropLine(idx);
                    }}
                    onDragLeave={(e) => {
                      // Leaving for a child of the same line is not leaving the line
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropLine(null);
                    }}
                    onDrop={(e) => handleDropOnLine(e, req, idx)}
                    className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg transition-colors ${
                      dropLine === idx
                        ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-400 dark:border-cyan-600 border-dashed ring-2 ring-cyan-400/30'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    {/* Shown while a file is held over the line, or uploading to it */}
                    {(dropLine === idx || uploadingLine === idx) && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg bg-cyan-50/90 dark:bg-slate-900/85 text-sm font-semibold text-cyan-700 dark:text-cyan-300 pointer-events-none">
                        {uploadingLine === idx ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" /> Uploading to {req.label}…
                          </>
                        ) : (
                          <>
                            <Upload size={15} /> Drop to upload as {req.label}
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {req.status === 'verified' ? (
                          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                        ) : req.status === 'pending' ? (
                          <Clock size={18} className="text-amber-600 dark:text-amber-400" />
                        ) : req.status === 'rejected' ? (
                          <XCircle size={18} className="text-rose-600 dark:text-rose-400" />
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 dark:border-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{req.label}</span>
                          <Badge variant={req.isMandatory ? 'danger' : 'default'} size="sm">
                            {req.isMandatory ? 'MANDATORY' : 'OPTIONAL'}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {req.status === 'missing'
                            ? 'Not uploaded yet'
                            : req.status === 'pending'
                              ? `Uploaded — awaiting verification (${req.documents.map((d) => d.name).join(', ')})`
                              : req.status === 'rejected'
                                ? 'Rejected by reviewer — upload a corrected version'
                                : `Verified (${req.documents.map((d) => d.name).join(', ')})`}
                        </div>
                      </div>
                    </div>

                    {req.status === 'missing' ? (
                      canUpload && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Upload size={13} />}
                          onClick={() => openUploadFor(req)}
                          className="self-end sm:self-center"
                        >
                          Upload
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('documents')}
                        className="self-end sm:self-center"
                      >
                        View in Documents
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Connected Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rule Details */}
            <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <ClipboardCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Statutory Rule Specification</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Rule Title & Code:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {record.rule?.name} ({record.rule?.code})
                  </span>
                </div>

                {record.rule?.legalReference && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Statutory Act / Section:</span>
                    <span className="text-indigo-600 dark:text-indigo-300 font-medium">
                      {record.rule.legalReference}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Category:</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {record.rule?.category?.label || 'General'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Recurrence & Cycle:</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {record.rule?.frequency?.label || 'Annual'} (Every {record.rule?.renewalCycle || 365} days)
                  </span>
                </div>

                {record.rule?.description && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Statutory Guidelines:</span>
                    <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{record.rule.description}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Company & Unit */}
            <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <User size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Company & Unit</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Parent Entity:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {record.entity?.name} ({record.entity?.entityCode})
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Operating Unit / Facility:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {record.location?.name} ({record.location?.locationCode})
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {[record.location?.address?.city, record.location?.address?.state].filter(Boolean).join(', ')}
                  </p>
                </div>

                {record.comments && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Latest Comment:</span>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-slate-700 dark:text-slate-200 italic border border-slate-200 dark:border-slate-700/60">
                      "{record.comments}"
                    </div>
                    {latestCommentSource && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {latestCommentSource.performedBy?.fullName ||
                          latestCommentSource.performedBy?.email ||
                          'Reviewer'}{' '}
                        · {latestCommentSource.action} ·{' '}
                        {new Date(latestCommentSource.performedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Documents & Evidence */}
      {activeTab === 'documents' && (
        <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Evidence Documents</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Certificates, inspection reports and authorisations. Replacing a file keeps every earlier version.
              </p>
            </div>
            {canUpload && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => setIsUploadModalOpen(true)}
              >
                Upload Document
              </Button>
            )}
          </div>

          {!record.documents || record.documents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No evidence documents uploaded yet.</div>
          ) : (
            <div className="space-y-3">
              {record.documents.map((doc) => {
                const versions = [...(doc.versions || [])].sort((a, b) => b.version - a.version);
                const isExpanded = !!expandedDocs[doc._id];

                return (
                  <div
                    key={doc._id}
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm dark:shadow-none"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700/40 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{doc.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50">
                              v{doc.currentVersion || doc.version || 1}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 mt-1">
                            <span className="truncate max-w-[220px]" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <span>•</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>•</span>
                            <span>By {doc.uploadedBy?.fullName || doc.uploadedBy?.email || 'User'}</span>
                            <span>•</span>
                            <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye size={13} />}
                          onClick={() => openPreview(doc)}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Download size={13} />}
                          onClick={() => handleDownload(doc._id, doc.fileName)}
                        >
                          Download
                        </Button>
                        {canUpload && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<RefreshCw size={13} />}
                            onClick={() => {
                              setReplaceTargetDoc(doc);
                              setIsReplaceModalOpen(true);
                            }}
                            title="Replace with new version (preserves history)"
                          >
                            New Version
                          </Button>
                        )}
                        {versions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<History size={13} />}
                            aria-expanded={isExpanded}
                            onClick={() => setExpandedDocs((prev) => ({ ...prev, [doc._id]: !prev[doc._id] }))}
                          >
                            {isExpanded ? 'Hide history' : `History (${versions.length})`}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 dark:border-slate-700/60 divide-y divide-slate-200 dark:divide-slate-700/60">
                        {versions.map((v) => (
                          <div
                            key={v._id || v.version}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 w-8 shrink-0">
                                v{v.version}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-300">
                                  <span className="truncate max-w-[220px]" title={v.fileName}>
                                    {v.fileName}
                                  </span>
                                  {v.status === 'active' ? (
                                    <Badge variant="success" size="sm">
                                      CURRENT
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" size="sm">
                                      SUPERSEDED
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                                  {formatFileSize(v.fileSize)} ·{' '}
                                  {v.uploadedBy?.fullName || v.uploadedBy?.email || 'User'} ·{' '}
                                  {new Date(v.uploadedAt).toLocaleString()}
                                  {v.notes ? ` · "${v.notes}"` : ''}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Download size={13} />}
                              onClick={() => handleDownload(doc._id, v.fileName, v.version)}
                            >
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

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
      <Modal isOpen={isPreviewModalOpen} onClose={closePreview} title={`Preview: ${previewDocTitle}`} size="xl">
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
