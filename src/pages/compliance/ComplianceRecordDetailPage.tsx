import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck,
  Plus,
  AlertTriangle,
  XCircle,
  Send,
  MessageSquare,
  ArrowRight,
  Check,
  Lock,
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
  WorkflowActionInfo,
  WorkflowApprovalsResponse,
} from '@/services/complianceRecordService';
import { adminService, MasterDataItem } from '@/services/adminService';
import { ROUTES } from '@/constants/routes';

const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`;

export const ComplianceRecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canUpload = can('document', 'upload');
  const canVerify = can('document', 'update');

  const [record, setRecord] = useState<ComplianceRecordItem | null>(null);
  const [docTypes, setDocTypes] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history'>('overview');
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

  // Phase 9: Workflow State & Action Confirmation Modal
  const [workflowData, setWorkflowData] = useState<WorkflowApprovalsResponse | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [selectedActionInfo, setSelectedActionInfo] = useState<WorkflowActionInfo | null>(null);
  const [workflowComments, setWorkflowComments] = useState('');
  const [workflowCommentsError, setWorkflowCommentsError] = useState('');
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);

  // Upload Document Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Replace Document Modal
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replaceTargetDoc, setReplaceTargetDoc] = useState<DocumentItem | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceNotes, setReplaceNotes] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);

  // Verify Document Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTargetDoc, setVerifyTargetDoc] = useState<DocumentItem | null>(null);
  const [verificationDecision, setVerificationDecision] = useState<'verified' | 'rejected'>('verified');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Preview Document Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState('');
  const [previewDocTitle, setPreviewDocTitle] = useState('');

  // Fetch Record
  const fetchRecord = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await complianceRecordService.getRecordById(id);
      setRecord(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load compliance record');
      navigate(ROUTES.COMPLIANCE_RECORDS);
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, toast]);

  // Fetch Workflow Approvals & Available Actions
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

  // Load prerequisites
  useEffect(() => {
    adminService
      .getMasterData({ category: 'document_type' })
      .then((docsRes) => {
        setDocTypes((docsRes.items || []).filter((i: MasterDataItem) => i.status === 'active'));
      })
      .catch(() => setDocTypes([]));
  }, []);

  // Handle Workflow Action Open
  const handleOpenWorkflowModal = (actionInfo: WorkflowActionInfo) => {
    setSelectedActionInfo(actionInfo);
    setWorkflowComments('');
    setWorkflowCommentsError('');
    setIsWorkflowModalOpen(true);
  };

  // Handle Workflow Action Submit
  const handleExecuteWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || !selectedActionInfo) return;

    if (selectedActionInfo.requiresComments && !workflowComments.trim()) {
      setWorkflowCommentsError(
        `Comments / rationale are strictly required when performing "${selectedActionInfo.action}".`
      );
      return;
    }

    setIsExecutingWorkflow(true);
    try {
      const res = await complianceRecordService.executeWorkflowAction(record._id, {
        action: selectedActionInfo.action,
        comments: workflowComments.trim() || undefined,
      });
      toast.success(res.message || `Action "${selectedActionInfo.action}" completed successfully.`);
      setIsWorkflowModalOpen(false);
      setWorkflowComments('');
      setSelectedActionInfo(null);
      // The workflow response carries a trimmed record; reload the fully populated one
      await Promise.all([fetchRecord(true), fetchWorkflow()]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Workflow transition failed');
    } finally {
      setIsExecutingWorkflow(false);
    }
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to replace document version');
    } finally {
      setIsReplacing(false);
    }
  };

  // Handle Document Verification
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyTargetDoc) return;

    setIsVerifying(true);
    try {
      const res = await complianceRecordService.verifyDocument(verifyTargetDoc._id, {
        verificationStatus: verificationDecision,
        notes: verificationNotes.trim() || undefined,
      });
      toast.success(res.message || 'Document verified');
      setIsVerifyModalOpen(false);
      setVerificationNotes('');
      fetchRecord(true);
      fetchWorkflow();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update verification status');
    } finally {
      setIsVerifying(false);
    }
  };

  // Open Preview Modal
  const openPreview = async (doc: DocumentItem, version?: number) => {
    try {
      const blob = await complianceRecordService.fetchDocumentFile(doc._id, { version, inline: true });
      setPreviewDocUrl(URL.createObjectURL(blob));
      setPreviewDocTitle(`${doc.name} (v${version || doc.currentVersion || 1})`);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load document preview');
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to download document');
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
        return <Badge variant="success" size="md">APPROVED</Badge>;
      case 'submitted':
        return <Badge variant="info" size="md">SUBMITTED</Badge>;
      case 'under_review':
        return <Badge variant="info" size="md">UNDER REVIEW</Badge>;
      case 'correction':
        return <Badge variant="warning" size="md">NEEDS CORRECTION</Badge>;
      case 'resubmitted':
        return <Badge variant="info" size="md">RESUBMITTED</Badge>;
      case 'expiring_soon':
        return <Badge variant="warning" size="md">EXPIRING SOON</Badge>;
      case 'expired':
        return <Badge variant="danger" size="md">EXPIRED</Badge>;
      case 'rejected':
        return <Badge variant="danger" size="md">REJECTED</Badge>;
      case 'pending':
      default:
        return <Badge variant="warning" size="md">PENDING ACTION</Badge>;
    }
  };

  const documentRequirements = workflowData?.documentRequirements || [];
  const blockedReasons = Array.from(
    new Set(
      (workflowData?.availableActions || [])
        .map((a) => a.disabledReason)
        .filter((r): r is string => !!r)
    )
  );

  // Workflow stepper position
  const WORKFLOW_STEPS = ['Pending', 'Submitted', 'Under Review', 'Approved'];
  const stepByStatus: Partial<Record<ComplianceRecordStatus, number>> = {
    submitted: 1,
    resubmitted: 1,
    under_review: 2,
    approved: 3,
    expiring_soon: 3,
  };
  const currentStep = stepByStatus[record.status] ?? 0;
  const workflowNote: { label: string; tone: 'amber' | 'rose' | 'sky' } | null =
    record.status === 'correction'
      ? { label: 'Returned for correction', tone: 'amber' }
      : record.status === 'rejected'
      ? { label: 'Rejected — resubmission needed', tone: 'rose' }
      : record.status === 'expired'
      ? { label: 'Expired — renewal required', tone: 'rose' }
      : record.status === 'expiring_soon'
      ? { label: 'Expiring soon', tone: 'amber' }
      : record.status === 'resubmitted'
      ? { label: 'Resubmitted after correction', tone: 'sky' }
      : null;
  const noteToneClass = {
    amber: 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-600/40 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-600/40 text-rose-700 dark:text-rose-300',
    sky: 'bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-600/40 text-sky-700 dark:text-sky-300',
  };

  // Relative due / expiry hints
  const awaitingUnit = ['pending', 'correction', 'rejected'].includes(record.status);
  const dueDays = record.dueDate ? daysFromToday(record.dueDate) : null;
  const expiryDays = record.expiryDate ? daysFromToday(record.expiryDate) : null;

  // Who wrote the comment currently stored on the record
  const latestCommentSource = (workflowData?.approvals || []).find(
    (a) => a.comments && a.comments === record.comments
  );

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
              <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{record.recordNumber}</span>
              <span>•</span>
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

        {/* Dynamic Workflow Actions & Upload */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Rules can ask for several approvals; show how far this record is */}
          {workflowData?.approvalProgress &&
            workflowData.approvalProgress.required > 1 &&
            ['submitted', 'resubmitted', 'under_review'].includes(workflowData.currentStatus) && (
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                {workflowData.approvalProgress.given} of {workflowData.approvalProgress.required} approvals given
              </span>
            )}
          {/* Action buttons generated dynamically based on role & status */}
          {workflowData?.availableActions && workflowData.availableActions.length > 0 ? (
            workflowData.availableActions.map((act) => {
              if (act.action === 'Approve') {
                return (
                  <Button
                    key={act.action}
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30 shadow-lg shadow-emerald-900/20"
                    leftIcon={<CheckCircle2 size={15} />}
                    disabled={!!act.disabledReason}
                    title={act.disabledReason}
                    onClick={() => handleOpenWorkflowModal(act)}
                  >
                    {act.label || 'Approve Compliance'}
                  </Button>
                );
              }
              if (act.action === 'Reject') {
                return (
                  <Button
                    key={act.action}
                    variant="danger"
                    leftIcon={<XCircle size={15} />}
                    disabled={!!act.disabledReason}
                    title={act.disabledReason}
                    onClick={() => handleOpenWorkflowModal(act)}
                  >
                    Reject
                  </Button>
                );
              }
              if (act.action === 'Request Correction') {
                return (
                  <Button
                    key={act.action}
                    variant="secondary"
                    className="bg-amber-600 hover:bg-amber-500 text-white border-amber-500/30 shadow-lg shadow-amber-900/20"
                    leftIcon={<AlertTriangle size={15} />}
                    disabled={!!act.disabledReason}
                    title={act.disabledReason}
                    onClick={() => handleOpenWorkflowModal(act)}
                  >
                    Request Correction
                  </Button>
                );
              }
              if (act.action === 'Start Review') {
                return (
                  <Button
                    key={act.action}
                    variant="secondary"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/30 shadow-lg shadow-indigo-900/20"
                    leftIcon={<ClipboardCheck size={15} />}
                    disabled={!!act.disabledReason}
                    title={act.disabledReason}
                    onClick={() => handleOpenWorkflowModal(act)}
                  >
                    Start Review
                  </Button>
                );
              }
              if (act.action === 'Submit' || act.action === 'Resubmit') {
                return (
                  <Button
                    key={act.action}
                    variant="primary"
                    leftIcon={<Send size={15} />}
                    disabled={!!act.disabledReason}
                    title={act.disabledReason}
                    onClick={() => handleOpenWorkflowModal(act)}
                  >
                    {act.label}
                  </Button>
                );
              }
              return (
                <Button
                  key={act.action}
                  variant="secondary"
                  disabled={!!act.disabledReason}
                    title={act.disabledReason}
                    onClick={() => handleOpenWorkflowModal(act)}
                >
                  {act.label}
                </Button>
              );
            })
          ) : record.status === 'approved' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-600/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Lock size={13} />
              Statutory Sign-Off Complete (Approved)
            </div>
          ) : null}

          {/* Upload Document */}
          {canUpload && (
            <Button
              variant="outline"
              leftIcon={<Upload size={15} />}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload Evidence
            </Button>
          )}
        </div>
      </div>

      {blockedReasons.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 rounded-lg flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {blockedReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Workflow Stepper ───────────────────────────────────────────────── */}
      <Card className="p-5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <ol className="flex items-center flex-1 min-w-0">
            {WORKFLOW_STEPS.map((label, idx) => {
              const isDone = idx < currentStep || (idx === currentStep && currentStep === WORKFLOW_STEPS.length - 1);
              const isCurrent = idx === currentStep && !isDone;
              return (
                <li key={label} className={`flex items-center ${idx > 0 ? 'flex-1' : ''}`}>
                  {idx > 0 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded ${
                        idx <= currentStep ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                  <div className="flex items-center gap-2 shrink-0" aria-current={isCurrent ? 'step' : undefined}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : isCurrent
                          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60'
                          : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isDone ? <Check size={14} /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs whitespace-nowrap ${
                        isCurrent
                          ? 'font-semibold text-slate-900 dark:text-white'
                          : isDone
                          ? 'font-medium text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          {workflowNote && (
            <span
              className={`self-start lg:self-center px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${noteToneClass[workflowNote.tone]}`}
            >
              {workflowNote.label}
            </span>
          )}
        </div>

        {/* Correction / Rejection Notice Banner */}
        {record.status === 'correction' && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 rounded-lg flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-300">Action Required: Correction Requested.</span>{' '}
              {record.comments ? (
                <span>Reviewer comments: "{record.comments}". Please update documents and resubmit.</span>
              ) : (
                <span>Please review statutory evidence requirements and resubmit for review.</span>
              )}
            </div>
          </div>
        )}

        {record.status === 'rejected' && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-600/40 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
            <XCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-900 dark:text-rose-300">Submission Rejected by Auditor.</span>{' '}
              {record.comments ? (
                <span>Rejection rationale: "{record.comments}". Revisions or resubmission needed.</span>
              ) : (
                <span>Compliance submission was rejected. Contact auditor or compliance officer.</span>
              )}
            </div>
          </div>
        )}
      </Card>

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
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={16} />
          Approval Trail & History ({workflowData?.approvals?.length || record.approvals?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock size={14} />
                Due Date
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {record.dueDate ? new Date(record.dueDate).toLocaleDateString() : '—'}
              </div>
              <div
                className={`text-[11px] mt-1 ${
                  awaitingUnit && dueDays !== null && dueDays < 0
                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {!record.dueDate
                  ? 'No deadline set'
                  : !awaitingUnit
                  ? 'Submission deadline'
                  : dueDays! < 0
                  ? `Overdue by ${Math.abs(dueDays!)} ${Math.abs(dueDays!) === 1 ? 'day' : 'days'}`
                  : `Due ${formatRelativeDays(record.dueDate)}`}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Upload size={14} />
                Submitted
              </div>
              <div
                className={`text-lg font-bold mt-1 ${
                  record.submissionDate ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {record.submissionDate ? new Date(record.submissionDate).toLocaleDateString() : 'Not yet'}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {record.submissionDate ? formatRelativeDays(record.submissionDate) : 'Awaiting submission'}
              </div>
            </Card>

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
                {record.approvalDate ? formatRelativeDays(record.approvalDate) : 'Awaiting sign-off'}
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
                  ? 'Set on approval'
                  : expiryDays! < 0
                  ? `Expired ${formatRelativeDays(record.expiryDate)}`
                  : `Expires ${formatRelativeDays(record.expiryDate)}`}
              </div>
            </Card>
          </div>

          {/* Required Documents Checklist */}
          {documentRequirements.length > 0 && (
            <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Required Documents</h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {documentRequirements.filter((r) => r.status !== 'missing').length} of {documentRequirements.length} uploaded
                  {' · '}
                  {documentRequirements.filter((r) => r.status === 'verified').length} verified
                </span>
              </div>

              <div className="space-y-2">
                {documentRequirements.map((req, idx) => (
                  <div
                    key={`${req.documentTypeId}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg"
                  >
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
                    <span className="text-indigo-600 dark:text-indigo-300 font-medium">{record.rule.legalReference}</span>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Category:</span>
                  <span className="text-slate-700 dark:text-slate-200">{record.rule?.category?.label || 'General'}</span>
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

            {/* Stakeholder & Assignment */}
            <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <User size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assigned Stakeholder & Unit</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Assigned Officer:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {record.assignedUser?.fullName || record.assignedUser?.email || 'Unassigned'}
                  </span>
                </div>

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
                    {record.location?.address?.city}, {record.location?.address?.state}
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
            <div className="text-center py-12 text-slate-500 text-sm">
              No evidence documents uploaded yet.
            </div>
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
                            {doc.verificationStatus === 'verified' ? (
                              <Badge variant="success" size="sm">VERIFIED</Badge>
                            ) : doc.verificationStatus === 'rejected' ? (
                              <Badge variant="danger" size="sm">REJECTED</Badge>
                            ) : (
                              <Badge variant="warning" size="sm">PENDING VERIFICATION</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 mt-1">
                            <span className="truncate max-w-[220px]" title={doc.fileName}>{doc.fileName}</span>
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
                        <Button variant="outline" size="sm" leftIcon={<Eye size={13} />} onClick={() => openPreview(doc)}>
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
                        {canVerify && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ShieldCheck size={13} />}
                            onClick={() => {
                              setVerifyTargetDoc(doc);
                              setIsVerifyModalOpen(true);
                            }}
                          >
                            Verify
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
                          <div key={v._id || v.version} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 w-8 shrink-0">
                                v{v.version}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-300">
                                  <span className="truncate max-w-[220px]" title={v.fileName}>{v.fileName}</span>
                                  {v.status === 'active' ? (
                                    <Badge variant="success" size="sm">CURRENT</Badge>
                                  ) : (
                                    <Badge variant="default" size="sm">SUPERSEDED</Badge>
                                  )}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                                  {formatFileSize(v.fileSize)} · {v.uploadedBy?.fullName || v.uploadedBy?.email || 'User'} ·{' '}
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

      {/* Tab 4: Approval Trail & History */}
      {activeTab === 'history' && (
        <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                Approval Trail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every lifecycle event, reviewer decision and correction request for this record.
              </p>
            </div>
            <Badge variant="info" size="md">
              {(workflowData?.approvals || []).length || (record.approvals || []).length} Audit Logged Decisions
            </Badge>
          </div>

          {/* Workflow Approvals History */}
          {(workflowData?.approvals && workflowData.approvals.length > 0) ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {workflowData.approvals.map((app, idx) => {
                const isApprove = app.action === 'Approve';
                const isReject = app.action === 'Reject';
                const isCorrection = app.action === 'Request Correction';
                const isReview = app.action === 'Start Review';

                return (
                  <div key={app._id || idx} className="relative group">
                    {/* Timeline Node Bullet */}
                    <div
                      className={`absolute -left-[27px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                        isApprove
                          ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                          : isReject
                          ? 'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                          : isCorrection
                          ? 'bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                          : isReview
                          ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                          : 'bg-sky-50 dark:bg-sky-950 border-sky-500 text-sky-600 dark:text-sky-400 ring-2 ring-sky-500/20'
                      }`}
                    >
                      {isApprove && <Check size={12} />}
                      {isReject && <XCircle size={12} />}
                      {isCorrection && <AlertTriangle size={12} />}
                      {isReview && <ClipboardCheck size={12} />}
                      {!isApprove && !isReject && !isCorrection && !isReview && <Send size={11} />}
                    </div>

                    {/* Timeline Event Card */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl transition-all space-y-3 shadow-sm dark:shadow-none">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              isApprove
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-600/40'
                                : isReject
                                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-600/40'
                                : isCorrection
                                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-600/40'
                                : isReview
                                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600/40'
                                : 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-600/40'
                            }`}
                          >
                            {app.action}
                          </span>

                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                            <span>{app.previousStatus}</span>
                            <ArrowRight size={12} className="text-slate-400 dark:text-slate-500" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{app.newStatus}</span>
                          </span>
                        </div>

                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {new Date(app.performedAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Actor Information */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white shrink-0">
                          {app.performedBy?.firstName?.[0] || 'U'}
                        </div>
                        <div className="text-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {app.performedBy?.fullName ||
                              `${app.performedBy?.firstName || ''} ${app.performedBy?.lastName || ''}`.trim() ||
                              app.performedBy?.email ||
                              'Authorized Officer'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {app.performedBy?.email}{' '}
                            {app.performedBy?.role ? `• ${(app.performedBy.role?.name || app.performedBy.role).toUpperCase()}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Comments */}
                      {app.comments && (
                        <div className="mt-2 p-3 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 shadow-sm dark:shadow-none">
                          <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1.5">Remarks:</span>
                            <span className="italic">"{app.comments}"</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (record.approvals && record.approvals.length > 0) ? (
            <div className="space-y-4">
              {record.approvals.map((app, idx) => (
                <div
                  key={app._id || idx}
                  className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2 shadow-sm dark:shadow-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Level {app.level} Decision
                      </span>
                      {app.decision === 'approved' ? (
                        <Badge variant="success" size="sm">APPROVED</Badge>
                      ) : app.decision === 'rejected' ? (
                        <Badge variant="danger" size="sm">REJECTED</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">{app.decision.toUpperCase()}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {app.decidedAt ? new Date(app.decidedAt).toLocaleString() : '—'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Reviewer:{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {app.approver?.fullName || app.approver?.email || 'System'}
                    </span>
                  </div>

                  {app.comments && (
                    <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-300 italic shadow-sm dark:shadow-none">
                      "{app.comments}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
              No approval actions recorded yet. Use the action buttons above to submit or review this record.
            </div>
          )}
        </Card>
      )}

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
              onChange={(e) => {
                const f = e.target.files?.[0];
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
            A new version (<strong>v{(replaceTargetDoc?.currentVersion || 1) + 1}</strong>) will be created.
            The current version will be archived into historical records and will <strong>never be destroyed</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Replacement File *
            </label>
            <input
              type="file"
              required
              onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
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

      {/* ── Verify Document Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title={`Verify "${verifyTargetDoc?.name}"`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleVerifySubmit} isLoading={isVerifying}>
              Confirm Verification
            </Button>
          </div>
        }
      >
        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Verification Decision *
            </label>
            <select
              value={verificationDecision}
              onChange={(e) => setVerificationDecision(e.target.value as 'verified' | 'rejected')}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="verified">Verified & Statutory Valid</option>
              <option value="rejected">Rejected (Defective / Illegible / Expired)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Verification Notes
            </label>
            <textarea
              rows={2}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="e.g. Seals and signatures verified against government gazette"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 resize-none shadow-sm dark:shadow-none"
            />
          </div>
        </form>
      </Modal>

      {/* ── Preview Document Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={closePreview}
        title={`Preview: ${previewDocTitle}`}
        size="xl"
      >
        <div className="h-[550px] w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
          <iframe
            src={previewDocUrl}
            title={previewDocTitle}
            className="w-full h-full border-0"
          />
        </div>
      </Modal>

      {/* ── Workflow Action Confirmation Modal ───────────────────────────────── */}
      <Modal
        isOpen={isWorkflowModalOpen}
        onClose={() => {
          if (!isExecutingWorkflow) {
            setIsWorkflowModalOpen(false);
            setSelectedActionInfo(null);
            setWorkflowComments('');
            setWorkflowCommentsError('');
          }
        }}
        title={
          selectedActionInfo?.action === 'Approve'
            ? 'Confirm Statutory Compliance Approval'
            : selectedActionInfo?.action === 'Reject'
            ? 'Reject Compliance Submission'
            : selectedActionInfo?.action === 'Request Correction'
            ? 'Request Compliance Correction'
            : selectedActionInfo?.action === 'Start Review'
            ? 'Place Under Inspection & Review'
            : `${selectedActionInfo?.action || 'Workflow Action'} Confirmation`
        }
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={isExecutingWorkflow}
              onClick={() => {
                setIsWorkflowModalOpen(false);
                setSelectedActionInfo(null);
                setWorkflowComments('');
                setWorkflowCommentsError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={
                selectedActionInfo?.action === 'Reject'
                  ? 'danger'
                  : 'primary'
              }
              className={
                selectedActionInfo?.action === 'Approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30 shadow-lg shadow-emerald-900/20'
                  : selectedActionInfo?.action === 'Request Correction'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500/30 shadow-lg shadow-amber-900/20'
                  : undefined
              }
              isLoading={isExecutingWorkflow}
              onClick={handleExecuteWorkflow}
            >
              {selectedActionInfo?.action === 'Approve'
                ? 'Confirm Approval'
                : selectedActionInfo?.action === 'Reject'
                ? 'Confirm Rejection'
                : selectedActionInfo?.action === 'Request Correction'
                ? 'Send Correction Request'
                : selectedActionInfo?.action === 'Start Review'
                ? 'Start Review'
                : `Confirm ${selectedActionInfo?.action}`}
            </Button>
          </div>
        }
      >
        {selectedActionInfo && (
          <form onSubmit={handleExecuteWorkflow} className="space-y-4">
            {/* Action Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                selectedActionInfo.action === 'Approve'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-200'
                  : selectedActionInfo.action === 'Reject'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-600/40 text-rose-800 dark:text-rose-200'
                  : selectedActionInfo.action === 'Request Correction'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600/40 text-amber-800 dark:text-amber-200'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600/40 text-indigo-800 dark:text-indigo-200'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {selectedActionInfo.action === 'Approve' && <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />}
                {selectedActionInfo.action === 'Reject' && <XCircle size={18} className="text-rose-600 dark:text-rose-400" />}
                {selectedActionInfo.action === 'Request Correction' && <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />}
                {selectedActionInfo.action === 'Start Review' && <ClipboardCheck size={18} className="text-indigo-600 dark:text-indigo-400" />}
                {['Submit', 'Resubmit'].includes(selectedActionInfo.action) && <Send size={18} className="text-sky-600 dark:text-sky-400" />}
              </div>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-sm">
                  {selectedActionInfo.label}
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedActionInfo.description}
                </p>
              </div>
            </div>

            {/* Transition Indicator */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Current Status</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{record.status.replace('_', ' ')}</span>
              </div>
              <ArrowRight size={16} className="text-slate-400 dark:text-slate-500" />
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Target Status</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">{selectedActionInfo.targetStatus.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Comments Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                {selectedActionInfo.requiresComments
                  ? `${selectedActionInfo.action === 'Reject' ? 'Rejection Reason / Non-Compliance Notes' : 'Correction Instructions'} *`
                  : 'Decision Comments / Notes (Optional)'}
              </label>
              <textarea
                rows={3}
                value={workflowComments}
                onChange={(e) => {
                  setWorkflowComments(e.target.value);
                  if (workflowCommentsError) setWorkflowCommentsError('');
                }}
                required={selectedActionInfo.requiresComments}
                placeholder={
                  selectedActionInfo.action === 'Approve'
                    ? 'e.g. Statutory verification complete. Approved for 2026/27 cycle.'
                    : selectedActionInfo.action === 'Reject'
                    ? 'e.g. PCB certificate expired on 2026-08-31. Re-upload valid renewal.'
                    : selectedActionInfo.action === 'Request Correction'
                    ? 'e.g. Uploaded lab test report is missing lab seal. Resubmit stamped copy.'
                    : 'Add any relevant context or review remarks...'
                }
                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 resize-none shadow-sm dark:shadow-none ${
                  workflowCommentsError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {workflowCommentsError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {workflowCommentsError}
                </p>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ComplianceRecordDetailPage;
