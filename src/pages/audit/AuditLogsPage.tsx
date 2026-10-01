/**
 * Audit Logs Page
 *
 * Immutable regulatory audit trail with advanced search, multi-dimensional filters,
 * pagination, and interactive side-by-side / inline Before & After difference inspection.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  X,
  RefreshCw,
  Eye,
  Shield,
  Clock,
  FileCode,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import {
  auditService,
  AuditLogItem,
  AuditFilters,
  AuditFilterOptions,
} from '@/services/auditService';
import { useToast } from '@/hooks/useToast';

export const AuditLogsPage: React.FC = () => {
  const toast = useToast();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<AuditFilterOptions>({
    modules: [],
    actions: [],
    entityTypes: [],
    users: [],
  });

  // Filters State
  const [filters, setFilters] = useState<AuditFilters>({
    page: 1,
    limit: 20,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Selected Log for Difference Inspection Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'diff' | 'raw'>('diff');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load filter options once
  useEffect(() => {
    auditService
      .getFilterOptions()
      .then((opts) => setFilterOptions(opts))
      .catch((err) => console.error('Failed to load audit filters:', err));
  }, []);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditService.getAuditLogs(filters);
      setLogs(res.logs);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load audit logs: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handlers
  const handleFilterChange = (key: keyof AuditFilters, val: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: val || undefined,
      page: 1, // reset page on filter change
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
  };

  const handleCopyJson = (data: any, keyName: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedKey(keyName);
    toast.success('JSON payload copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Action badge color styling
  const getActionBadgeStyle = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATED') || a.includes('UPLOADED') || a.includes('APPROVE')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (a.includes('UPDATED') || a.includes('CHANGED') || a.includes('REPLACED')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    if (a.includes('DELETED') || a.includes('REJECTED') || a.includes('OVERDUE')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (a.includes('COMPLETED') || a.includes('VERIFIED')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'page' && k !== 'limit' && k !== 'sortBy' && k !== 'sortOrder'
  ).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <History size={14} />
            <span>Immutable Compliance Traceability</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Audit Trail Registry
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Cryptographically sealed, append-only ledger tracking all administrative actions, data mutations, and statutory transitions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Shield size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Strictly Read-Only (Non-Mutable)</span>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all"
            title="Refresh Audit Logs"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''} />
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Filter size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Query & Filter Parameters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold">
                {activeFiltersCount} active
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <X size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Text Search */}
          <div className="lg:col-span-2 relative">
            <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-1">
              Search Keywords
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search description, IP, user..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-1">Module</label>
            <select
              value={filters.module || ''}
              onChange={(e) => handleFilterChange('module', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Modules</option>
              {filterOptions.modules.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-1">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Actions</option>
              {filterOptions.actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-1">Actor User</label>
            <select
              value={filters.userId || ''}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Users</option>
              {filterOptions.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Record ID */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-1">Record ID</label>
            <input
              type="text"
              placeholder="e.g. 651..."
              value={filters.recordId || ''}
              onChange={(e) => handleFilterChange('recordId', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ── Audit Logs Table ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading immutable audit trail records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            No audit log entries match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Module / Entity</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-200">{log.user?.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{log.user?.email}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${getActionBadgeStyle(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase">
                          {log.module}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">/ {log.entityType}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-md">
                      <p className="text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">{log.description}</p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {log.ipAddress}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 ml-auto transition-all"
                      >
                        <Eye size={13} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Inspect Diff</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing page <span className="text-slate-900 dark:text-slate-200 font-bold">{pagination.page}</span> of{' '}
              <span className="text-slate-900 dark:text-slate-200 font-bold">{pagination.totalPages}</span> ({pagination.total} total logs)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-all shadow-sm dark:shadow-none"
              >
                Previous
              </button>
              <button
                onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-all shadow-sm dark:shadow-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Difference Inspection Modal (Before vs After) ────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${getActionBadgeStyle(
                      selectedLog.action
                    )}`}
                  >
                    {selectedLog.action}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    &middot; {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedLog.description}</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setDiffViewMode('diff')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      diffViewMode === 'diff'
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    State Difference
                  </button>
                  <button
                    onClick={() => setDiffViewMode('raw')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      diffViewMode === 'raw'
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Raw Payloads
                  </button>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Context Pill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Actor</span>
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-200 mt-0.5">{selectedLog.user?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{selectedLog.user?.email}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Resource</span>
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-200 mt-0.5">{selectedLog.entityType}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">ID: {selectedLog.recordId}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">IP Address</span>
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-200 mt-0.5 font-mono">{selectedLog.ipAddress}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Client Agent</span>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={selectedLog.userAgent}>
                    {selectedLog.userAgent}
                  </p>
                </div>
              </div>

              {/* View Mode: Difference View */}
              {diffViewMode === 'diff' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCode size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span>Field Mutation Delta</span>
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {Object.keys(selectedLog.diff || {}).length} field(s) changed
                    </span>
                  </div>

                  {!selectedLog.diff || Object.keys(selectedLog.diff).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      No property differences detected or this event represents an atomic snapshot.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(selectedLog.diff).map(([key, change]) => (
                        <div
                          key={key}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{key}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                            {/* Previous Value */}
                            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
                              <span className="block text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400 mb-1">
                                Previous State
                              </span>
                              <pre className="whitespace-pre-wrap break-all text-[11px]">
                                {change.before === null || change.before === undefined
                                  ? 'undefined'
                                  : JSON.stringify(change.before, null, 2)}
                              </pre>
                            </div>

                            {/* New Value */}
                            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                              <span className="block text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                                New State
                              </span>
                              <pre className="whitespace-pre-wrap break-all text-[11px]">
                                {change.after === null || change.after === undefined
                                  ? 'undefined'
                                  : JSON.stringify(change.after, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Raw Payloads Side-by-Side */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Previous State Raw */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        Previous Value (Before)
                      </span>
                      <button
                        onClick={() => handleCopyJson(selectedLog.previousValue, 'prev')}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedKey === 'prev' ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-300 overflow-x-auto max-h-80">
                      {JSON.stringify(selectedLog.previousValue || {}, null, 2)}
                    </pre>
                  </div>

                  {/* New State Raw */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        New Value (After)
                      </span>
                      <button
                        onClick={() => handleCopyJson(selectedLog.newValue, 'new')}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedKey === 'new' ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-300 overflow-x-auto max-h-80">
                      {JSON.stringify(selectedLog.newValue || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Log UUID: <span className="font-mono text-slate-700 dark:text-slate-400">{selectedLog.id}</span>
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
