import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertTriangle,
  Building2,
  MapPin,
  CheckSquare,
  Hourglass,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { reportService, ReportType } from '@/services/reportService';
import { useToast } from '@/hooks/useToast';

interface ReportCardDef {
  type: ReportType;
  title: string;
  category: string;
  description: string;
  route: string;
  icon: React.ElementType;
  accent: string;
  gradient: string;
  metricsLabel: string;
}

const REPORT_CARDS: ReportCardDef[] = [
  {
    type: 'compliance',
    title: 'Statutory Compliance Master Report',
    category: 'Regulatory Oversight',
    description:
      'Complete registry of statutory compliance records across all entities and clinical facilities, covering approval states and validities.',
    route: ROUTES.REPORTS_COMPLIANCE,
    icon: FileText,
    accent: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10',
    gradient: 'from-indigo-500/10 via-transparent to-transparent dark:from-indigo-600/20 dark:to-blue-600/5',
    metricsLabel: 'All Records',
  },
  {
    type: 'expiry',
    title: 'Statutory Expiry & Renewal Forecast',
    category: 'Risk Management',
    description:
      'Predictive forecast of licences and statutory certifications expiring in 30, 60, and 90 days with urgency ratings.',
    route: ROUTES.REPORTS_EXPIRY,
    icon: Clock,
    accent: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10',
    gradient: 'from-amber-500/10 via-transparent to-transparent dark:from-amber-600/20 dark:to-orange-600/5',
    metricsLabel: 'Upcoming Renewals',
  },
  {
    type: 'pending',
    title: 'Pending Approvals & Review Pipeline',
    category: 'Workflow Tracking',
    description:
      'Operational backlog of compliance records waiting for document upload, officer review, or correction resubmissions.',
    route: ROUTES.REPORTS_PENDING,
    icon: Hourglass,
    accent: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10',
    gradient: 'from-blue-500/10 via-transparent to-transparent dark:from-blue-600/20 dark:to-cyan-600/5',
    metricsLabel: 'Backlog Queue',
  },
  {
    type: 'overdue',
    title: 'Non-Compliance & Overdue Violations',
    category: 'Critical Action',
    description:
      'High-risk audit report detailing expired licences, rejected applications, and overdue remedial tasks requiring immediate escalation.',
    route: ROUTES.REPORTS_OVERDUE,
    icon: AlertTriangle,
    accent: 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10',
    gradient: 'from-rose-500/10 via-transparent to-transparent dark:from-rose-600/20 dark:to-pink-600/5',
    metricsLabel: 'Critical Violations',
  },
  {
    type: 'entities',
    title: 'Corporate Legal Entity Performance',
    category: 'Corporate Governance',
    description:
      'Entity-level compliance rollups, facility unit totals, compliance percentage scores, and assigned corporate governance owners.',
    route: ROUTES.REPORTS_ENTITIES,
    icon: Building2,
    accent: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10',
    gradient: 'from-emerald-500/10 via-transparent to-transparent dark:from-emerald-600/20 dark:to-teal-600/5',
    metricsLabel: 'Corporate Entities',
  },
  {
    type: 'locations',
    title: 'Facility Unit Audit & Compliance Report',
    category: 'Facility Operations',
    description:
      'Detailed facility and clinic compliance audit listing unit managers, locations, state jurisdictions, and unit compliance scores.',
    route: ROUTES.REPORTS_LOCATIONS,
    icon: MapPin,
    accent: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10',
    gradient: 'from-purple-500/10 via-transparent to-transparent dark:from-purple-600/20 dark:to-violet-600/5',
    metricsLabel: 'Facility Units',
  },
  {
    type: 'tasks',
    title: 'Statutory Remedial Tasks & Action Items',
    category: 'Task Automation',
    description:
      'Automated and manual task assignments, priority statuses, completion audit trails, and overdue deadline monitoring.',
    route: ROUTES.REPORTS_TASKS,
    icon: CheckSquare,
    accent: 'text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10',
    gradient: 'from-cyan-500/10 via-transparent to-transparent dark:from-cyan-600/20 dark:to-sky-600/5',
    metricsLabel: 'Remedial Tasks',
  },
];

export const ReportsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const handleQuickExport = async (e: React.MouseEvent, type: ReportType, format: 'csv' | 'excel') => {
    e.stopPropagation();
    try {
      if (format === 'csv') {
        await reportService.downloadCsv(type);
        toast.success('CSV report export downloaded successfully');
      } else {
        await reportService.downloadExcel(type);
        toast.success('Excel report export downloaded successfully');
      }
    } catch (err: any) {
      toast.error('Failed to export report: ' + (err.message || 'Error'));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <Sparkles size={14} />
            <span>Statutory Intelligence & Auditing</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Reports & Export Center
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Central repository for statutory audit exports, compliance analytics, and print-ready regulatory packages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Direct Database Driven</span>
          </div>
        </div>
      </div>

      {/* ── Feature Highlights Banner ────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-slate-50 to-slate-100 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-950 border border-indigo-200 dark:border-indigo-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">
            Enterprise Output Engines Enabled
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
            All reports query backend MongoDB aggregations live. Filter by Date Range, State, Entity, Facility Unit, Status, Category, and Assigned Users. Export in native RFC 4180 CSV, formatted Excel, or generate print-friendly PDF views.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(ROUTES.REPORTS_COMPLIANCE)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <span>Open Compliance Report</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Reports Grid (All 7 Reports) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.type}
              onClick={() => navigate(card.route)}
              className={`group relative p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 bg-gradient-to-b ${card.gradient} transition-all duration-200 hover:-translate-y-1 shadow-sm hover:shadow-xl cursor-pointer flex flex-col justify-between`}
            >
              <div>
                {/* Top Badge & Icon */}
                <div className="flex items-start justify-between mb-3.5">
                  <div className={`p-2.5 rounded-xl border ${card.accent}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                    {card.category}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:underline">
                  View Live Preview
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </span>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleQuickExport(e, card.type, 'csv')}
                    title="Quick Export CSV"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-slate-700/50 text-[11px] font-medium transition-all"
                  >
                    CSV
                  </button>
                  <button
                    onClick={(e) => handleQuickExport(e, card.type, 'excel')}
                    title="Quick Export Excel"
                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 border border-emerald-200 dark:border-slate-700/50 text-[11px] font-medium transition-all"
                  >
                    XLS
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
