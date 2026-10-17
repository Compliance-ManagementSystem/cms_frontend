import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Pause, Play, Presentation, X } from 'lucide-react';
import { dashboardService, type OperationsDashboardData, type OperationsFilters } from '@/services/dashboardService';
import { socketService } from '@/services/socketService';
import { resolveStateId } from '@/components/charts/IndiaMap';
import { SCORE_BANDS, scoreBandIndex, useChartTheme } from '@/components/charts/chartTheme';
import { StatusGauge, type StatusSlice } from '@/components/charts/StatusMeters';
import {
  LICENCE_ORDER,
  LICENCE_LABELS,
  LICENCE_STATUS_PARAM,
  withQuery,
  Legend,
  StatCard,
  ShareRows,
  LicenceTypeChart,
  buildUnitCards,
} from '@/components/dashboard/operationsParts';
import { FixedTheme } from '@/contexts/ThemeContext';
import { ROUTES } from '@/constants/routes';
import { createIndiaScene, isWebGLAvailable, type ActiveState, type IndiaSceneHandle } from './indiaScene';

/**
 * National approvals map: the operations dashboard's figures around a 3D map of India.
 * Every number comes from the same request as the dashboard, so the two always agree.
 * States are coloured by the dashboard's approval bands and stand taller the more is
 * approved; picking one flies to it and narrows the whole page to that state.
 * The page is always dark, whatever theme the rest of the app uses.
 */

const REFRESH_MS = 60_000;
// How long presentation mode stays on each slide; the speed button steps through these
const SLIDE_SPEEDS = [8_000, 15_000, 30_000];

const GLASS = 'bg-[#0a1220]/85 backdrop-blur-md border border-[#1d2b44] rounded-xl';
const SELECT_CLASS =
  'bg-[#0a1220]/85 border border-[#2a3c5c] rounded-full px-4 py-2 text-[11px] tracking-[0.12em] uppercase text-[#c8d6ea] focus:outline-none focus:ring-2 focus:ring-indigo-500';

const toHex = (css: string) => parseInt(css.replace('#', ''), 16);

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <section className="px-5 py-4 border-t border-[#1d2b44] first:border-t-0">
    <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
    {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    {children}
  </section>
);

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const chart = useChartTheme();
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [webgl] = useState(isWebGLAvailable);

  const [filters, setFilters] = useState<OperationsFilters>({});
  // Every state, for the map and the list; the selected view narrows to one state
  const [allStates, setAllStates] = useState<OperationsDashboardData | null>(null);
  const [stateView, setStateView] = useState<OperationsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [animate, setAnimate] = useState(true);
  const requestId = useRef(0);

  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<IndiaSceneHandle | null>(null);

  // Same request as the dashboard: all states for the company, plus the picked state
  const load = useCallback(
    async (silent = false) => {
      const id = ++requestId.current;
      if (!silent) setIsLoading(true);
      try {
        const [all, state] = await Promise.all([
          dashboardService.getOverview({ entity: filters.entity }),
          filters.state ? dashboardService.getOverview(filters) : Promise.resolve(null),
        ]);
        if (id !== requestId.current) return;
        setAllStates(all);
        setStateView(state);
        setAnimate(!silent);
        setLoadError(null);
      } catch (err: any) {
        if (id !== requestId.current) return;
        if (!silent) setLoadError(err.response?.data?.message || err.message || 'Could not load the map data');
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [filters]
  );

  // Load on filter change, when a record changes elsewhere, and once a minute, as the dashboard does
  useEffect(() => {
    load();
    const refresh = () => load(true);
    const unsubscribe = socketService.on('compliance:status_changed', refresh);
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [load]);

  // While a state's figures load, the previous ones stay up, so the cards ease from them
  const lastView = useRef<OperationsDashboardData | null>(null);
  const view = (filters.state ? stateView : allStates) ?? lastView.current;
  lastView.current = view;

  // States with licences, placed on the map; names the map cannot place are listed apart
  const { mapped, unmapped } = useMemo(() => {
    const placed: Array<OperationsDashboardData['byState'][number] & { mapId: string; pct: number }> = [];
    const notPlaced: string[] = [];
    const usedIds = new Set<string>();
    (allStates?.byState || [])
      .filter((row) => row.licences.total > 0)
      .forEach((row) => {
        const mapId = resolveStateId(row.state);
        if (!mapId || usedIds.has(mapId)) {
          notPlaced.push(row.state);
          return;
        }
        usedIds.add(mapId);
        placed.push({ ...row, mapId, pct: row.licences.approvedPct ?? 0 });
      });
    placed.sort((a, b) => b.licences.total - a.licences.total);
    return { mapped: placed, unmapped: notPlaced };
  }, [allStates]);

  const stateByMapId = useMemo(() => new Map(mapped.map((row) => [row.mapId, row])), [mapped]);
  const bandColor = (pct: number) => chart.scoreBands[scoreBandIndex(pct)];

  // ── Scene ────────────────────────────────────────────────────────────────────
  const selectStateRef = useRef<(id: string) => void>(() => {});
  selectStateRef.current = (id: string) => {
    const row = stateByMapId.get(id);
    if (row) openState(row.state);
  };

  useEffect(() => {
    if (!webgl || !stageRef.current) return;
    const handle = createIndiaScene(stageRef.current, {
      reducedMotion,
      onHover: (id, x, y) => setHover(id ? { id, x, y } : null),
      onSelect: (id) => selectStateRef.current(id),
    });
    sceneRef.current = handle;
    return () => {
      handle.dispose();
      sceneRef.current = null;
    };
  }, [webgl, reducedMotion]);

  useEffect(() => {
    sceneRef.current?.setActive(
      new Map<string, ActiveState>(
        mapped.map((row) => [row.mapId, { color: toHex(chart.scoreBands[scoreBandIndex(row.pct)]), clearancePct: row.pct }])
      )
    );
  }, [mapped, chart.scoreBands]);

  const selectedMapId = filters.state ? resolveStateId(filters.state) : undefined;
  useEffect(() => {
    sceneRef.current?.focus(selectedMapId ?? null);
  }, [selectedMapId]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  // ── Presentation mode: All India, then each state in turn, full screen ─────────
  const [presenting, setPresenting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [slideMs, setSlideMs] = useState(SLIDE_SPEEDS[1]);
  const [slide, setSlide] = useState(0);
  const slides = useMemo<Array<string | undefined>>(() => [undefined, ...mapped.map((row) => row.state)], [mapped]);
  // Only leave full screen on exit if the presentation entered it
  const wentFullscreen = useRef(false);

  const goToSlide = (index: number) => {
    const next = (index + slides.length) % slides.length;
    setSlide(next);
    setFilters((prev) => ({ ...prev, state: slides[next] }));
  };

  const startPresentation = () => {
    setPresenting(true);
    setPaused(false);
    setAutoRotate(false);
    goToSlide(0);
    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) {
      root
        .requestFullscreen()
        .then(() => {
          wentFullscreen.current = true;
        })
        .catch(() => undefined);
    }
  };

  const stopPresentation = useCallback(() => {
    setPresenting(false);
    if (wentFullscreen.current && document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    wentFullscreen.current = false;
  }, []);

  // Next slide on a timer, restarted whenever the slide changes by hand
  useEffect(() => {
    if (!presenting || paused || slides.length < 2) return;
    const timer = window.setTimeout(() => goToSlide(slide + 1), slideMs);
    return () => window.clearTimeout(timer);
    // goToSlide only reads slides, which is listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenting, paused, slide, slideMs, slides]);

  // Leaving full screen with the browser's own Esc ends the presentation too
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && wentFullscreen.current) {
        wentFullscreen.current = false;
        setPresenting(false);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (wentFullscreen.current && document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  // Keys: Space pauses, arrows step, Esc exits
  useEffect(() => {
    if (!presenting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopPresentation();
      else if (event.key === ' ') {
        event.preventDefault();
        setPaused((on) => !on);
      } else if (event.key === 'ArrowRight') goToSlide(slide + 1);
      else if (event.key === 'ArrowLeft') goToSlide(slide - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenting, slide, slides, stopPresentation]);

  function openState(state: string) {
    setFilters((prev) => ({ ...prev, state }));
    setAutoRotate(false);
    // Picking a state mid-presentation carries on from there
    if (presenting) setSlide(Math.max(0, slides.indexOf(state)));
  }
  const showNational = () => {
    setFilters((prev) => ({ ...prev, state: undefined }));
    if (presenting) setSlide(0);
  };

  // ── Figures, built as the dashboard builds them ──────────────────────────────
  const licenceRows = useMemo(
    () =>
      (view?.byLicence ?? []).map((row) => ({
        ...row,
        fullName: row.name,
        name: row.name.length > 22 ? `${row.name.slice(0, 21)}…` : row.name,
      })),
    [view]
  );

  const motion = animate && !reducedMotion;
  const hovered = hover ? stateByMapId.get(hover.id) : undefined;
  const asOf = allStates ? new Date(allStates.generatedAt).toLocaleDateString('en-GB') : '';
  const entities = allStates?.filterOptions.entities ?? [];

  const recordsLink = (bucket: (typeof LICENCE_ORDER)[number], extra: Record<string, string | undefined> = {}) =>
    withQuery(ROUTES.COMPLIANCE_RECORDS, { status: LICENCE_STATUS_PARAM[bucket], entity: filters.entity, ...extra });

  const licences = view?.licences;
  const shownBuckets = LICENCE_ORDER.filter((bucket) => bucket !== 'expired' || (licences?.expired ?? 0) > 0);
  const licenceLegend = shownBuckets.map((bucket) => ({ label: LICENCE_LABELS[bucket], color: chart.licence[bucket] }));
  const licenceSlices: StatusSlice[] = licences
    ? shownBuckets.map((bucket) => ({
        key: bucket,
        label: LICENCE_LABELS[bucket],
        value: licences[bucket],
        color: chart.licence[bucket],
        to: recordsLink(bucket),
      }))
    : [];

  return (
    <div className="dark min-h-screen lg:fixed lg:inset-0 lg:overflow-hidden bg-[#05070e] text-slate-100 font-sans">
      {/* Header */}
      <header className="relative z-10 flex flex-wrap items-start justify-between gap-3 p-4 lg:absolute lg:inset-x-0 lg:top-0 lg:px-6 lg:pt-5 lg:pb-8 lg:bg-gradient-to-b lg:from-[#05070e] lg:via-[#05070e]/80 lg:to-transparent">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(withQuery(ROUTES.DASHBOARD, { state: filters.state }))}
            aria-label="Back to dashboard"
            className="mt-0.5 p-2 rounded-full border border-[#2a3c5c] hover:bg-white/5"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-bold tracking-[0.2em] uppercase text-white">National Approvals Map</h1>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#8aa0bd] mt-0.5">
              Units and licence status · {[entities.find((e) => e._id === filters.entity)?.code, filters.state].filter(Boolean).join(' · ') || 'All India'}
              {asOf && ` · ${asOf}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entities.length > 1 && (
            <select
              aria-label="Filter by company"
              value={filters.entity || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, entity: e.target.value || undefined }))}
              className={SELECT_CLASS}
            >
              <option value="">All companies</option>
              {entities.map((entity) => (
                <option key={entity._id} value={entity._id}>
                  {entity.code}
                </option>
              ))}
            </select>
          )}
          {webgl && (
            <button
              type="button"
              aria-pressed={autoRotate}
              onClick={() => setAutoRotate((on) => !on)}
              className="rounded-full border border-[#2a3c5c] px-4 py-2 text-[11px] tracking-[0.18em] uppercase hover:bg-white/5"
            >
              Auto orbit {autoRotate ? 'on' : 'off'}
            </button>
          )}
          {mapped.length > 0 && (
            <button
              type="button"
              aria-pressed={presenting}
              onClick={() => (presenting ? stopPresentation() : startPresentation())}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] tracking-[0.18em] uppercase ${
                presenting
                  ? 'bg-[#4da3ff] border-[#4da3ff] text-[#05070e]'
                  : 'border-[#4da3ff]/60 text-[#4da3ff] hover:bg-[#4da3ff]/10'
              }`}
            >
              <Presentation size={14} />
              {presenting ? 'Exit presentation' : 'Presentation'}
            </button>
          )}
          <button
            type="button"
            onClick={showNational}
            disabled={!filters.state}
            className="rounded-full border border-[#f0c75e]/60 px-4 py-2 text-[11px] tracking-[0.18em] uppercase text-[#f0c75e] hover:bg-[#f0c75e]/10 disabled:opacity-50 disabled:cursor-default"
          >
            All India
          </button>
        </div>
      </header>

      {/* ── 3D stage ─────────────────────────────────────────────────────────── */}
      <div className="relative h-[60vh] lg:absolute lg:inset-0 lg:h-auto">
        {webgl ? (
          <div ref={stageRef} className="absolute inset-0" aria-label="3D map of India showing licences approved by state" role="img" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className={`${GLASS} max-w-md p-6`}>
              <p className="text-base font-semibold text-white">3D view isn't available in this browser</p>
              <p className="text-sm text-[#8aa0bd] mt-2">
                It needs WebGL, which this browser or device has turned off. The figures below still work, and the 2D map
                is on the dashboard.
              </p>
              <button
                type="button"
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="mt-4 rounded-full border border-[#2a3c5c] px-4 py-2 text-xs tracking-[0.18em] uppercase hover:bg-white/5"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        )}

        {isLoading && !allStates && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 size={32} className="animate-spin text-[#4da3ff]" />
          </div>
        )}

        {/* Tooltip */}
        {hover && (
          <div
            className={`${GLASS} fixed z-30 pointer-events-none px-3 py-2 text-xs`}
            style={{ left: hover.x + 14, top: hover.y + 14 }}
          >
            {hovered ? (
              <>
                <p className="font-semibold text-white">{hovered.state}</p>
                <p className="text-slate-300 mt-0.5">
                  {hovered.pct}% approved · {hovered.licences.total} licences
                </p>
                <p className="text-slate-400">
                  {hovered.licences.approved} approved · {hovered.licences.applied + hovered.licences.toBeApplied} pending
                  {hovered.licences.expired > 0 ? ` · ${hovered.licences.expired} expired` : ''}
                </p>
              </>
            ) : (
              <p className="text-slate-400">No licences</p>
            )}
          </div>
        )}
      </div>

      {/* ── Overlays (over the map on large screens, below it on small ones) ── */}
      <div className="relative flex flex-col gap-4 p-4 lg:absolute lg:inset-0 lg:pt-[88px] lg:px-6 lg:pb-6 lg:pointer-events-none">
        {loadError && (
          <div className={`${GLASS} lg:pointer-events-auto max-w-md p-4 text-sm text-rose-300`}>
            {loadError}
            <button type="button" onClick={() => load()} className="block mt-2 text-xs underline">
              Try again
            </button>
          </div>
        )}

        {view && licences && (
          <>
            {/* The dashboard's top cards, on a solid backing so the map behind cannot show through */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 lg:pointer-events-auto [&>button]:bg-[#0a1220]/90 [&>button]:backdrop-blur-md [&>button]:border-[#1d2b44]">
              {buildUnitCards(view, filters).map((card, index) => (
                <StatCard key={card.key} card={card} animate={motion} delay={index * 70} />
              ))}
            </div>

            <div className="flex flex-col-reverse lg:flex-row lg:flex-1 lg:min-h-0 lg:items-end lg:justify-between gap-4">
              {presenting ? (
                <section
                  className={`${GLASS} lg:pointer-events-auto lg:w-[360px] p-4`}
                  aria-label="Presentation controls"
                >
                  <style>{'@keyframes map3d-slide-progress{from{width:0}to{width:100%}}'}</style>
                  <p className="text-[11px] tracking-[0.18em] uppercase text-[#8aa0bd]">
                    Presentation · {slide + 1} of {slides.length}
                    {paused && ' · paused'}
                  </p>
                  <p className="text-lg font-semibold text-white mt-0.5">{slides[slide] ?? 'All India'}</p>
                  <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      key={`${slide}-${paused}-${slideMs}`}
                      className="h-full bg-[#4da3ff] motion-reduce:hidden"
                      style={
                        paused
                          ? { width: 0 }
                          : { animation: `map3d-slide-progress ${slideMs}ms linear forwards` }
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => goToSlide(slide - 1)}
                      aria-label="Previous"
                      className="p-2 rounded-full border border-[#2a3c5c] hover:bg-white/5"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaused((on) => !on)}
                      aria-label={paused ? 'Resume' : 'Pause'}
                      className="p-2 rounded-full border border-[#2a3c5c] hover:bg-white/5"
                    >
                      {paused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => goToSlide(slide + 1)}
                      aria-label="Next"
                      className="p-2 rounded-full border border-[#2a3c5c] hover:bg-white/5"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlideMs(SLIDE_SPEEDS[(SLIDE_SPEEDS.indexOf(slideMs) + 1) % SLIDE_SPEEDS.length])}
                      aria-label={`Time on each slide: ${slideMs / 1000} seconds. Change`}
                      className="rounded-full border border-[#2a3c5c] px-3 py-1.5 text-xs tabular-nums hover:bg-white/5"
                    >
                      {slideMs / 1000}s
                    </button>
                    <button
                      type="button"
                      onClick={stopPresentation}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#2a3c5c] px-3 py-1.5 text-xs hover:bg-white/5"
                    >
                      <X size={13} /> Exit
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-slate-400">
                    <span className="font-medium">Licences approved:</span>
                    {SCORE_BANDS.map((band, index) => (
                      <span key={band.label} className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chart.scoreBands[index] }} />
                        {band.label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Space pauses · arrow keys step · Esc exits</p>
                </section>
              ) : (
                /* States, coloured by share approved */
                <section
                  className={`${GLASS} lg:pointer-events-auto lg:w-[320px] lg:max-h-full overflow-auto p-5`}
                  aria-label="Licences approved by state"
                >
                  <h2 className="text-sm font-semibold text-slate-100">Licences Approved by State</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Share of applicable licences approved. Click a state to open it.</p>
                  <ul className="mt-3 space-y-1">
                    {mapped.map((row) => (
                      <li key={row.state}>
                        <button
                          type="button"
                          onClick={() => (filters.state === row.state ? showNational() : openState(row.state))}
                          aria-current={filters.state === row.state ? 'true' : undefined}
                          className={`w-full flex items-center gap-2.5 rounded px-1.5 py-1 text-left text-sm hover:bg-white/5 ${
                            filters.state === row.state ? 'bg-white/10' : ''
                          }`}
                        >
                          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: bandColor(row.pct) }} />
                          <span className="text-slate-200">{row.state}</span>
                          <span className="ml-auto tabular-nums text-slate-400">
                            {row.licences.approved}/{row.licences.total} · {row.pct}%
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {mapped.length === 0 && <p className="text-sm text-slate-400 mt-3">No licence records in this view.</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-slate-400">
                    <span className="font-medium">Licences approved:</span>
                    {SCORE_BANDS.map((band, index) => (
                      <span key={band.label} className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chart.scoreBands[index] }} />
                        {band.label}
                      </span>
                    ))}
                  </div>
                  {unmapped.length > 0 && <p className="text-[11px] text-slate-400 mt-2">Not on the map: {unmapped.join(', ')}</p>}
                  <p className="text-[11px] text-slate-500 mt-2">
                    Taller states have more approved. Drag to orbit, scroll to zoom.
                  </p>
                </section>
              )}

              {/* The open view's licence figures, as on the dashboard */}
              <aside className={`${GLASS} lg:pointer-events-auto lg:w-[460px] lg:h-full flex flex-col overflow-hidden`}>
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#1d2b44]">
                  <h2 className="text-sm font-bold tracking-[0.18em] uppercase text-white">{filters.state || 'All India'}</h2>
                  {filters.state && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(withQuery(ROUTES.DASHBOARD, { state: filters.state }))}
                        className="text-[11px] tracking-[0.12em] uppercase text-[#4da3ff] hover:underline"
                      >
                        Open on dashboard
                      </button>
                      <button
                        type="button"
                        onClick={showNational}
                        aria-label="Back to all India"
                        className="p-1.5 rounded-full border border-[#2a3c5c] hover:bg-white/5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-auto">
                  <Section title="Licence Completion" subtitle="All applicable licences in this view">
                    {licences.total === 0 ? (
                      <p className="text-sm text-slate-400 mt-3">No licence records in this view.</p>
                    ) : (
                      <>
                        <StatusGauge slices={licenceSlices} total={licences.total} headline="approved" animate={motion} />
                        <p className="text-[11px] text-slate-400 mt-2">
                          {licences.notApplicable.toLocaleString()} more are marked not applicable and are left out.
                        </p>
                      </>
                    )}
                  </Section>

                  <Section title="Company Comparison" subtitle="Units operated and licence status">
                    {view.byCompany.length === 0 ? (
                      <p className="text-sm text-slate-400 mt-3">No companies in this view.</p>
                    ) : (
                      <>
                        <Legend items={licenceLegend} />
                        <ShareRows
                          buckets={shownBuckets}
                          rows={view.byCompany.map((company) => ({
                            key: company.entityId,
                            label: company.code,
                            hint: `${company.units} ${company.units === 1 ? 'unit' : 'units'} · ${company.total} licences`,
                            counts: company,
                          }))}
                        />
                      </>
                    )}
                  </Section>

                  <Section title="Licence Status by Type" subtitle="Each licence across the units it applies to. Click a bar to open those records.">
                    {licenceRows.length === 0 ? (
                      <p className="text-sm text-slate-400 mt-3">No licence records in this view.</p>
                    ) : (
                      <>
                        <Legend items={licenceLegend} />
                        <LicenceTypeChart
                          rows={licenceRows}
                          buckets={shownBuckets}
                          animate={motion}
                          yAxisWidth={140}
                          onOpen={(bucket, ruleId) => navigate(recordsLink(bucket, { rule: ruleId }))}
                        />
                      </>
                    )}
                  </Section>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** Always dark: the dashboard's components follow this page's theme, not the app's */
const ApprovalsMap3DPage: React.FC = () => (
  <FixedTheme theme="dark">
    <MapPage />
  </FixedTheme>
);

export default ApprovalsMap3DPage;
