import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Loader2,
  CornerDownLeft,
  Building2,
  MapPin,
  ClipboardCheck,
  CheckSquare,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { SIDEBAR_GROUPS, type SidebarItem } from '@/constants/sidebar';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { entityService } from '@/services/entityService';
import { locationService } from '@/services/locationService';
import { complianceRecordService } from '@/services/complianceRecordService';
import { taskService } from '@/services/taskService';
import { adminService } from '@/services/adminService';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
  icon: LucideIcon;
}

interface SearchGroup {
  label: string;
  results: SearchResult[];
}

interface SearchSource {
  label: string;
  /** Sidebar path whose role/permission rules decide whether this source is searchable */
  sidebarPath: string;
  fetch: (q: string) => Promise<SearchResult[]>;
}

const RESULTS_PER_GROUP = 5;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

const humanize = (value?: string) => (value ? value.replace(/_/g, ' ') : '');
const joinParts = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(' · ');

const SEARCH_SOURCES: SearchSource[] = [
  {
    label: 'Entities',
    sidebarPath: ROUTES.ENTITIES,
    fetch: async (q) => {
      const { entities } = await entityService.getEntities({ search: q, limit: RESULTS_PER_GROUP });
      return entities.map((e) => ({
        id: e._id,
        title: e.name,
        subtitle: joinParts(e.entityCode, e.entityType?.label, e.address?.city),
        path: `${ROUTES.ENTITIES}/${e._id}`,
        icon: Building2,
      }));
    },
  },
  {
    label: 'Locations',
    sidebarPath: ROUTES.LOCATIONS,
    fetch: async (q) => {
      const { locations } = await locationService.getLocations({ search: q, limit: RESULTS_PER_GROUP });
      return locations.map((l) => ({
        id: l._id,
        title: l.name,
        subtitle: joinParts(l.locationCode, l.entity?.name, l.address?.city),
        path: `${ROUTES.LOCATIONS}/${l._id}`,
        icon: MapPin,
      }));
    },
  },
  {
    label: 'Compliance Records',
    sidebarPath: ROUTES.COMPLIANCE_RECORDS,
    fetch: async (q) => {
      const { records } = await complianceRecordService.getRecords({ search: q, limit: RESULTS_PER_GROUP });
      return records.map((r) => ({
        id: r._id,
        title: r.rule?.name || r.recordNumber,
        subtitle: joinParts(r.recordNumber, r.location?.name, humanize(r.status)),
        path: `${ROUTES.COMPLIANCE_RECORDS}/${r._id}`,
        icon: ClipboardCheck,
      }));
    },
  },
  {
    label: 'Tasks',
    sidebarPath: ROUTES.TASKS,
    fetch: async (q) => {
      const { data } = await taskService.getTasks({ search: q, limit: RESULTS_PER_GROUP });
      return data.map((t) => ({
        id: t._id,
        title: t.title,
        subtitle: joinParts(humanize(t.status), t.priority, t.location?.name),
        path: `${ROUTES.TASKS}?task=${t._id}`,
        icon: CheckSquare,
      }));
    },
  },
  {
    label: 'Users',
    sidebarPath: ROUTES.ADMIN_USERS,
    fetch: async (q) => {
      const { users } = await adminService.getUsers({ search: q, limit: RESULTS_PER_GROUP });
      return users.map((u) => ({
        id: u._id,
        title: u.fullName,
        subtitle: joinParts(u.email, u.role?.name),
        path: `${ROUTES.ADMIN_USERS}?search=${encodeURIComponent(u.email)}`,
        icon: Users,
      }));
    },
  },
];

const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  // Same visibility rules the sidebar applies
  const isItemVisible = (item: SidebarItem): boolean => {
    if (item.disabled) return false;
    if (item.roles && item.roles.length > 0 && !hasRole(item.roles)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  };

  const visiblePages = useMemo(
    () =>
      SIDEBAR_GROUPS.filter((g) => !g.roles || hasRole(g.roles))
        .flatMap((g) => g.items)
        .filter(isItemVisible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasRole, hasPermission]
  );

  const allowedSources = useMemo(
    () =>
      SEARCH_SOURCES.filter((source) =>
        visiblePages.some((page) => page.path === source.sidebarPath)
      ),
    [visiblePages]
  );

  // Reset and focus each time the palette opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setGroups([]);
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced search across every source the user may access
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const currentRequest = ++requestId.current;

    const pageMatches: SearchGroup[] = (() => {
      const matches = visiblePages
        .filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase()))
        .map((p) => ({ id: p.path, title: p.label, subtitle: 'Go to page', path: p.path, icon: p.icon }));
      return matches.length ? [{ label: 'Pages', results: matches }] : [];
    })();

    if (q.length < MIN_QUERY_LENGTH) {
      setGroups(pageMatches);
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const settled = await Promise.allSettled(allowedSources.map((s) => s.fetch(q)));
      if (currentRequest !== requestId.current) return; // a newer query has started

      const recordGroups = settled.flatMap((result, i) =>
        result.status === 'fulfilled' && result.value.length
          ? [{ label: allowedSources[i].label, results: result.value }]
          : []
      );
      setGroups([...pageMatches, ...recordGroups]);
      setActiveIndex(0);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open, allowedSources, visiblePages]);

  const flatResults = useMemo(() => groups.flatMap((g) => g.results), [groups]);

  // Keep the highlighted row in view while navigating with arrow keys
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const selectResult = (result: SearchResult) => {
    onClose();
    navigate(result.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (flatResults.length ? (i + 1) % flatResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (flatResults.length ? (i - 1 + flatResults.length) % flatResults.length : 0));
    } else if (e.key === 'Enter' && flatResults[activeIndex]) {
      e.preventDefault();
      selectResult(flatResults[activeIndex]);
    }
  };

  if (!open) return null;

  const trimmed = query.trim();
  let runningIndex = -1;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-800">
          {loading ? (
            <Loader2 size={18} className="text-slate-400 animate-spin flex-shrink-0" />
          ) : (
            <Search size={18} className="text-slate-400 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities, locations, records, tasks…"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 h-14 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-medium text-slate-400 border border-slate-700">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {groups.length === 0 && !loading && (
            <div className="px-4 py-10 text-center text-xs text-slate-500">
              {trimmed.length >= MIN_QUERY_LENGTH
                ? `No results for “${trimmed}”.`
                : 'Type at least 2 characters to search records.'}
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label} className="pb-1">
              <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </div>
              {group.results.map((result) => {
                runningIndex += 1;
                const index = runningIndex;
                const active = index === activeIndex;
                const Icon = result.icon;
                return (
                  <button
                    key={`${group.label}-${result.id}`}
                    type="button"
                    data-index={index}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => selectResult(result)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      active ? 'bg-slate-800/80' : ''
                    }`}
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex-shrink-0">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-slate-100 truncate">
                        {result.title}
                      </span>
                      {result.subtitle && (
                        <span className="block text-[11px] text-slate-400 truncate">
                          {result.subtitle}
                        </span>
                      )}
                    </span>
                    {active && <CornerDownLeft size={14} className="text-slate-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GlobalSearch;
