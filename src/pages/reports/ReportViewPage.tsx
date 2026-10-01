/**
 * Report View Page
 *
 * Universal interactive report viewer supporting:
 * - Compliance Report
 * - Expiry Report
 * - Pending Report
 * - Overdue Report
 * - Entity Report
 * - Location Report
 * - Task Report
 *
 * Provides live preview, multi-dimensional filters, sorting, search,
 * CSV download, Excel download, and print-ready layout.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertTriangle,
  Building2,
  MapPin,
  CheckSquare,
  Hourglass,
  Download,
  Printer,
  Filter,
  X,
  Search,
  RefreshCw,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import {
  reportService,
  ReportType,
  ReportFilters,
  ReportResult,
  FilterOptions,
} from '@/services/reportService';
import { useToast } from '@/hooks/useToast';

interface ReportViewPageProps {
  reportType?: ReportType;
}

const REPORT_TABS: Array<{ type: ReportType; label: string; icon: React.ElementType; route: string }> = [
  { type: 'compliance', label: 'Compliance', icon: FileText, route: ROUTES.REPORTS_COMPLIANCE },
  { type: 'expiry', label: 'Expiry & Renewal', icon: Clock, route: ROUTES.REPORTS_EXPIRY },
  { type: 'pending', label: 'Pending Approvals', icon: Hourglass, route: ROUTES.REPORTS_PENDING },
  { type: 'overdue', label: 'Overdue & Violations', icon: AlertTriangle, route: ROUTES.REPORTS_OVERDUE },
  { type: 'entities', label: 'Entities', icon: Building2, route: ROUTES.REPORTS_ENTITIES },
  { type: 'locations', label: 'Locations / Units', icon: MapPin, route: ROUTES.REPORTS_LOCATIONS },
  { type: 'tasks', label: 'Remedial Tasks', icon: CheckSquare, route: ROUTES.REPORTS_TASKS },
];

export const ReportViewPage: React.FC<ReportViewPageProps> = ({ reportType: propType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Determine current report type from props or pathname
  const activeType: ReportType = useMemo(() => {
    if (propType) return propType;
    const path = location.pathname;
    if (path.includes('/expiry')) return 'expiry';
    if (path.includes('/pending')) return 'pending';
    if (path.includes('/overdue')) return 'overdue';
    if (path.includes('/entities')) return 'entities';
    if (path.includes('/locations')) return 'locations';
    if (path.includes('/tasks')) return 'tasks';
    return 'compliance';
  }, [propType, location.pathname]);

  // Filters State
  const [filters, setFilters] = useState<ReportFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    states: [],
    entities: [],
    locations: [],
    categories: [],
    users: [],
  });

  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Fetch filter dropdown options once
  useEffect(() => {
    reportService
      .getFilters()
      .then((opts) => setFilterOptions(opts))
      .catch((err) => console.error('Failed to load filter options:', err));
  }, []);

  // Fetch report data on activeType or filters change
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getReport(activeType, filters);
      setReport(res);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      toast.error('Failed to load report: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  }, [activeType, filters, toast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Filtered locations based on selected entity & state
  const availableLocations = useMemo(() => {
    return filterOptions.locations.filter((loc) => {
      if (filters.entity && loc.entityId !== filters.entity) return false;
      if (filters.state && loc.state?.toLowerCase() !== filters.state.toLowerCase()) return false;
      return true;
    });
  }, [filterOptions.locations, filters.entity, filters.state]);

  // Client-side text search & sorting on data preview
  const displayData = useMemo(() => {
    if (!report?.data) return [];
    let items = [...report.data];

    // Search query across all string values
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortField) {
      items.sort((a, b) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return items;
  }, [report?.data, searchQuery, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(displayData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayData.slice(start, start + pageSize);
  }, [displayData, currentPage, pageSize]);

  // Table columns inferred from report data
  const columns = useMemo(() => {
    if (!report?.data || report.data.length === 0) return [];
    return Object.keys(report.data[0]).filter((k) => k !== 'id');
  }, [report?.data]);

  // Handlers
  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value || undefined };
      if (key === 'entity') next.location = undefined;
      return next;
    });
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const handleSort = (col: string) => {
    if (sortField === col) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(col);
      setSortAsc(true);
    }
  };

  const handleExportCsv = async () => {
    setExporting('csv');
    try {
      await reportService.downloadCsv(activeType, filters);
      toast.success('CSV export downloaded successfully');
    } catch (err: any) {
      toast.error('Export failed: ' + (err.message || 'Error'));
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      await reportService.downloadExcel(activeType, filters);
      toast.success('Excel spreadsheet export downloaded successfully');
    } catch (err: any) {
      toast.error('Export failed: ' + (err.message || 'Error'));
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatHeader = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .toUpperCase();
  };

  const renderCellBadge = (key: string, val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-500">—</span>;

    const lower = String(val).toLowerCase();

    if (key === 'status') {
      if (lower === 'approved' || lower === 'active') {
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {val}
          </span>
        );
      }
      if (lower === 'expiring_soon' || lower === 'medium') {
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {val}
          </span>
        );
      }
      if (lower === 'expired' || lower === 'rejected' || lower === 'critical' || lower === 'overdue') {
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            {val}
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
          {val}
        </span>
      );
    }

    if (key === 'urgency') {
      const color =
        lower === 'critical'
          ? 'text-rose-400 font-bold'
          : lower === 'high'
          ? 'text-amber-400 font-semibold'
          : 'text-slate-300';
      return <span className={`capitalize ${color}`}>{val}</span>;
    }

    if (key === 'complianceScore') {
      const scoreNum = parseInt(String(val), 10);
      const color =
        scoreNum >= 90
          ? 'text-emerald-400'
          : scoreNum >= 75
          ? 'text-amber-400'
          : 'text-rose-400 font-bold';
      return <span className={`font-mono font-semibold ${color}`}>{val}</span>;
    }

    if (key === 'daysRemaining' || key === 'daysOverdue') {
      const isNum = typeof val === 'number';
      const isNegative = isNum && val < 0;
      return (
        <span className={`font-mono font-semibold ${isNegative || key === 'daysOverdue' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
          {val} {isNum ? 'days' : ''}
        </span>
      );
    }

    return <span className="text-slate-800 dark:text-slate-200">{String(val)}</span>;
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Print Header (Only visible when printing) ────────────────────────── */}
      <div className="hidden print:block mb-6 pb-4 border-b border-black">
        <h1 className="text-2xl font-bold text-black">{report?.title || 'Statutory Compliance Report'}</h1>
        <p className="text-xs text-gray-600 mt-1">
          Generated on {new Date().toLocaleString()} &middot; Confidential Compliance Registry
        </p>
      </div>

      {/* ── Breadcrumb & Top Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <button
              onClick={() => navigate(ROUTES.REPORTS)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
            >
              Reports Hub
            </button>
            <ChevronRight size={12} className="text-slate-400 dark:text-slate-600" />
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{report?.title || 'Report'}</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{report?.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time MongoDB audit query &middot; Generated at{' '}
            {report?.generatedAt ? new Date(report.generatedAt).toLocaleTimeString() : '...'}
          </p>
        </div>

        {/* Action Buttons: CSV, Excel, Print */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all shadow-sm"
            title="Refresh Report Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-500' : ''} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting !== null}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            {exporting === 'csv' ? (
              <Loader2 size={14} className="animate-spin text-indigo-500" />
            ) : (
              <Download size={14} className="text-indigo-600 dark:text-indigo-400" />
            )}
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            {exporting === 'excel' ? (
              <Loader2 size={14} className="animate-spin text-emerald-500" />
            ) : (
              <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* ── Report Type Switcher Tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800/60 print:hidden">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.type === activeType;
          return (
            <button
              key={tab.type}
              onClick={() => navigate(tab.route)}
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Multi-Dimension Filter Bar ───────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm dark:shadow-none print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Filter size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Report Parameters & Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px]">
                {activeFiltersCount} active
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <X size={13} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Date Range Start */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">State</label>
            <select
              value={filters.state || ''}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All States</option>
              {filterOptions.states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Entity */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Entity</label>
            <select
              value={filters.entity || ''}
              onChange={(e) => handleFilterChange('entity', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Entities</option>
              {filterOptions.entities.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Location / Unit</label>
            <select
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Units</option>
              {availableLocations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Category</label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Categories</option>
              {filterOptions.categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned User */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Assigned User</label>
            <select
              value={filters.assignedUser || ''}
              onChange={(e) => handleFilterChange('assignedUser', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Users</option>
              {filterOptions.users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Summary KPI Cards ────────────────────────────────────────────────── */}
      {report?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 print:grid-cols-6">
          {Object.entries(report.summary).map(([key, val]) => (
            <div
              key={key}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm"
            >
              <p className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                {formatHeader(key)}
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">{String(val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Search & Result Count Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search preview records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="text-slate-800 dark:text-slate-200 font-bold">{displayData.length}</span> of{' '}
          <span className="text-slate-800 dark:text-slate-200 font-bold">{report?.totalRecords || 0}</span> records
        </div>
      </div>

      {/* ── Live Data Table Preview ───────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-lg">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Querying live database records...</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="p-16 text-center text-slate-400 dark:text-slate-500 text-sm">
            No records matched the selected report filters and parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="py-3 px-4 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{formatHeader(col)}</span>
                        <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-600" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    {columns.map((col) => (
                      <td key={col} className="py-3 px-4 whitespace-nowrap">
                        {renderCellBadge(col, row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Table Pagination ──────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 print:hidden">
            <div>
              Page <span className="text-slate-800 dark:text-slate-200 font-bold">{currentPage}</span> of{' '}
              <span className="text-slate-800 dark:text-slate-200 font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
