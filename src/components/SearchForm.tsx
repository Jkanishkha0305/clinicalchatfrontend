'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearResults, setFilters as setFiltersAction } from '@/store/slices/searchSlice';
import { setCurrentSession, updateSessionFromChat } from '@/store/slices/sessionsSlice';
import { SearchFilters } from '@/lib/types';
import { useSearchMutation } from '@/hooks/useSearchQuery';
import {
  activeFilterCount,
  ageGroupOptions,
  emptyFilters,
  funderTypeOptions,
  phaseOptions,
  searchPrompts,
  sexOptions,
  statusOptions,
  studyTypeOptions,
} from '@/lib/searchConfig';
import {
  ActivityIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  FileTextIcon,
  FlaskIcon,
  MapPinIcon,
  MessageIcon,
  SearchIcon,
  SlidersIcon,
  SparklesIcon,
  UsersIcon,
} from '@/components/ui/icons';

type ArrayField = 'status' | 'phase' | 'studyType' | 'ageGroups' | 'funderType';
type BooleanField = 'healthyVolunteers' | 'hasProtocol' | 'hasSAP' | 'hasICF' | 'fdaaa801Violation';

type ActiveChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

const binaryOptions = [
  { value: '', label: 'Any evidence state' },
  { value: 'true', label: 'With results' },
  { value: 'false', label: 'Without results' },
];

const detailGroups = [
  {
    id: 'design',
    title: 'Study design',
    description: 'Trial structure, title-based search, and sponsor context.',
  },
  {
    id: 'participants',
    title: 'Participants',
    description: 'Population, age bands, and healthy-volunteer controls.',
  },
  {
    id: 'evidence',
    title: 'Evidence and documents',
    description: 'Result availability, protocol artifacts, and compliance flags.',
  },
  {
    id: 'timeline',
    title: 'Timeline and funding',
    description: 'Dates, funding source, and milestone narrowing.',
  },
] as const;

export default function SearchForm() {
  const dispatch = useAppDispatch();
  const { filters: currentFilters, loading } = useAppSelector((state) => state.search);
  const { currentSessionId, loading: sessionsLoading } = useAppSelector((state) => state.sessions);
  const searchMutation = useSearchMutation();

  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setFilters(currentFilters ?? emptyFilters);
  }, [currentFilters]);

  const toggleArrayFilter = (field: ArrayField, value: string) => {
    setFilters((previous) => {
      const currentValues = previous[field] || [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...previous,
        [field]: nextValues,
      };
    });
  };

  const toggleBooleanFilter = (field: BooleanField) => {
    setFilters((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const setTextField = (field: keyof SearchFilters, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openAnalyst = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openFloatingChat'));
    }
  };

  const applyPrompt = (query: string, presetFilters?: Partial<SearchFilters>) => {
    setFilters({
      ...emptyFilters,
      ...presetFilters,
      query,
      useSemanticSearch: true,
      maxSemanticResults: 1000,
    });
    setShowAdvanced(false);
  };

  const handleSearch = async () => {
    dispatch(setFiltersAction(filters));

    try {
      const result = await searchMutation({
        filters,
        page: 1,
        sessionId: currentSessionId || undefined,
        syncToRedux: true,
      });

      if (result?.sessionInfo) {
        const sessionInfo = result.sessionInfo;
        const session = sessionInfo.session;
        const sessionId = sessionInfo.sessionId || session?.id;

        if (sessionId) {
          dispatch(
            updateSessionFromChat({
              sessionId,
              title: session?.title || 'New Chat',
              description: session?.description || '',
            })
          );
          dispatch(setCurrentSession(sessionId));
        }
      }
    } catch (error) {
      if (error !== 'Request aborted') {
        console.error('Search failed:', error);
      }
    }
  };

  const handleClear = () => {
    setFilters(emptyFilters);
    dispatch(setFiltersAction(emptyFilters));
    dispatch(clearResults());
  };

  const activeChips: ActiveChip[] = [];

  if (filters.query) {
    activeChips.push({
      id: 'query',
      label: `Brief: ${filters.query}`,
      onRemove: () =>
        setFilters((previous) => ({
          ...previous,
          query: '',
          useSemanticSearch: false,
        })),
    });
  }

  if (filters.condition) {
    activeChips.push({
      id: 'condition',
      label: `Condition: ${filters.condition}`,
      onRemove: () => setTextField('condition', ''),
    });
  }

  if (filters.intervention) {
    activeChips.push({
      id: 'intervention',
      label: `Intervention: ${filters.intervention}`,
      onRemove: () => setTextField('intervention', ''),
    });
  }

  if (filters.location) {
    activeChips.push({
      id: 'location',
      label: `Location: ${filters.location}`,
      onRemove: () => setTextField('location', ''),
    });
  }

  statusOptions.forEach((option) => {
    if (filters.status?.includes(option.value)) {
      activeChips.push({
        id: `status-${option.value}`,
        label: option.label,
        onRemove: () => toggleArrayFilter('status', option.value),
      });
    }
  });

  phaseOptions.forEach((option) => {
    if (filters.phase?.includes(option.value)) {
      activeChips.push({
        id: `phase-${option.value}`,
        label: option.label,
        onRemove: () => toggleArrayFilter('phase', option.value),
      });
    }
  });

  if (filters.hasResults) {
    activeChips.push({
      id: 'has-results',
      label: filters.hasResults === 'true' ? 'With results' : 'Without results',
      onRemove: () => setTextField('hasResults', ''),
    });
  }

  if (sessionsLoading) {
    return (
      <div className="workspace-panel-light animate-pulse">
        <div className="space-y-4 p-6">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="h-14 rounded-[24px] bg-slate-200" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-12 rounded-2xl bg-slate-200" />
            <div className="h-12 rounded-2xl bg-slate-200" />
          </div>
          <div className="h-48 rounded-[28px] bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="workspace-panel-light overflow-hidden">
        <div className="border-b border-slate-200/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="workspace-kicker workspace-kicker-light">
                <SparklesIcon className="h-4 w-4" />
                Prompt-first search
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-[1.7rem]">
                Start with a question. Refine only if you need to.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Describe the studies you want as if you were briefing an analyst. The structured filters stay available,
                but they no longer dominate the screen.
              </p>
            </div>
            <div className="rounded-3xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <SearchIcon className="h-4 w-4 text-sky-600" />
                {activeFilterCount(filters)} active filters
              </div>
              <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
                Keep the workspace calm. Open advanced filters only when the brief needs more structure.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <label htmlFor="search-brief" className="workspace-label">
              <SparklesIcon className="h-4 w-4 text-sky-600" />
              What trial universe are you trying to understand?
            </label>
            <textarea
              id="search-brief"
              rows={5}
              value={filters.query || ''}
              onChange={(event) => {
                const query = event.target.value;
                setFilters((previous) => ({
                  ...previous,
                  query,
                  useSemanticSearch: query.trim().length > 0 ? true : previous.useSemanticSearch,
                }));
              }}
              placeholder="Example: Show Phase 3 obesity trials evaluating GLP-1 therapies and surface the active sponsors."
              className="workspace-textarea mt-3"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={filters.useSemanticSearch || false}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      useSemanticSearch: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Use semantic ranking
              </label>

              {filters.useSemanticSearch ? (
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
                  Max results
                  <input
                    type="number"
                    min="1"
                    max="30000"
                    value={filters.maxSemanticResults ?? 1000}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setFilters((previous) => ({
                        ...previous,
                        maxSemanticResults: Number.isFinite(value) && value > 0 ? Math.min(value, 30000) : 1000,
                      }));
                    }}
                    className="w-20 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-right text-xs text-slate-900 outline-none focus:border-sky-400"
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {searchPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => applyPrompt(prompt.query, prompt.filters)}
                className="group rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_20px_40px_rgba(14,165,233,0.12)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">{prompt.label}</span>
                  <ArrowRightIcon className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-sky-600" />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">{prompt.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-6 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="workspace-field">
              <span className="workspace-label">
                <FlaskIcon className="h-4 w-4 text-cyan-600" />
                Condition or disease
              </span>
              <input
                type="text"
                value={filters.condition || ''}
                onChange={(event) => setTextField('condition', event.target.value)}
                placeholder="Cancer, diabetes, COPD, heart failure..."
                className="workspace-input"
              />
            </label>

            <label className="workspace-field">
              <span className="workspace-label">
                <ActivityIcon className="h-4 w-4 text-emerald-600" />
                Intervention or mechanism
              </span>
              <input
                type="text"
                value={filters.intervention || ''}
                onChange={(event) => setTextField('intervention', event.target.value)}
                placeholder="GLP-1, CAR-T, pembrolizumab..."
                className="workspace-input"
              />
            </label>

            <label className="workspace-field">
              <span className="workspace-label">
                <MapPinIcon className="h-4 w-4 text-violet-600" />
                Geography
              </span>
              <input
                type="text"
                value={filters.location || ''}
                onChange={(event) => setTextField('location', event.target.value)}
                placeholder="United States, Boston, Germany..."
                className="workspace-input"
              />
            </label>

            <label className="workspace-field">
              <span className="workspace-label">
                <FileTextIcon className="h-4 w-4 text-rose-600" />
                Study title or acronym
              </span>
              <input
                type="text"
                value={filters.title || ''}
                onChange={(event) => setTextField('title', event.target.value)}
                placeholder="TRIDENT, Keynote, SURMOUNT..."
                className="workspace-input"
              />
            </label>
          </div>

          <div className="workspace-subpanel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Rapid filters</h3>
                <p className="mt-1 text-sm text-slate-500">Use chips instead of deep dropdown menus for the most common narrowing moves.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced((previous) => !previous)}
                className="workspace-button-ghost"
              >
                <SlidersIcon className="h-4 w-4" />
                {showAdvanced ? 'Hide advanced filters' : 'Show advanced filters'}
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</div>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => {
                    const isActive = filters.status?.includes(option.value) || false;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArrayFilter('status', option.value)}
                        className={`workspace-chip ${isActive ? 'workspace-chip-active' : ''}`}
                      >
                        {isActive ? <CheckCircleIcon className="h-3.5 w-3.5" /> : null}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Phase</div>
                <div className="flex flex-wrap gap-2">
                  {phaseOptions.map((option) => {
                    const isActive = filters.phase?.includes(option.value) || false;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArrayFilter('phase', option.value)}
                        className={`workspace-chip ${isActive ? 'workspace-chip-active' : ''}`}
                      >
                        {isActive ? <CheckCircleIcon className="h-3.5 w-3.5" /> : null}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {activeChips.length > 0 ? (
            <div className="workspace-subpanel">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Current filter story</h3>
                  <p className="mt-1 text-sm text-slate-500">Everything active is visible here, so the workspace stays understandable.</p>
                </div>
                <button type="button" onClick={handleClear} className="workspace-button-ghost">
                  Reset all
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <button key={chip.id} type="button" onClick={chip.onRemove} className="workspace-chip workspace-chip-muted">
                    {chip.label}
                    <span className="text-slate-400">×</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {showAdvanced ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <SlidersIcon className="h-4 w-4" />
                Advanced workspace filters
              </div>

              <details className="workspace-details" open>
                <summary>
                  <div>
                    <div className="workspace-details-title">{detailGroups[0].title}</div>
                    <p className="workspace-details-copy">{detailGroups[0].description}</p>
                  </div>
                </summary>
                <div className="workspace-details-body">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Study type</div>
                    <div className="flex flex-wrap gap-2">
                      {studyTypeOptions.map((option) => {
                        const isActive = filters.studyType?.includes(option.value) || false;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleArrayFilter('studyType', option.value)}
                            className={`workspace-chip ${isActive ? 'workspace-chip-active' : ''}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="workspace-field">
                      <span className="workspace-label">Lead sponsor</span>
                      <input
                        type="text"
                        value={filters.sponsor || ''}
                        onChange={(event) => setTextField('sponsor', event.target.value)}
                        placeholder="Pfizer, NIH, academic center..."
                        className="workspace-input"
                      />
                    </label>
                    <label className="workspace-field">
                      <span className="workspace-label">Direct NCT lookup</span>
                      <input
                        type="text"
                        value={filters.nctId || ''}
                        onChange={(event) => setTextField('nctId', event.target.value)}
                        placeholder="NCT01234567"
                        className="workspace-input"
                      />
                    </label>
                  </div>
                </div>
              </details>

              <details className="workspace-details">
                <summary>
                  <div>
                    <div className="workspace-details-title">{detailGroups[1].title}</div>
                    <p className="workspace-details-copy">{detailGroups[1].description}</p>
                  </div>
                </summary>
                <div className="workspace-details-body">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Participant sex</div>
                    <div className="flex flex-wrap gap-2">
                      {sexOptions.map((option) => {
                        const isActive = (filters.sex || '') === option.value;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => setTextField('sex', option.value)}
                            className={`workspace-chip ${isActive ? 'workspace-chip-active' : ''}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Age groups</div>
                    <div className="flex flex-wrap gap-2">
                      {ageGroupOptions.map((option) => {
                        const isActive = filters.ageGroups?.includes(option.value) || false;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleArrayFilter('ageGroups', option.value)}
                            className={`workspace-chip ${isActive ? 'workspace-chip-active' : ''}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleBooleanFilter('healthyVolunteers')}
                    className={`workspace-chip ${filters.healthyVolunteers ? 'workspace-chip-active' : ''}`}
                  >
                    <UsersIcon className="h-4 w-4" />
                    Accepts healthy volunteers
                  </button>
                </div>
              </details>

              <details className="workspace-details">
                <summary>
                  <div>
                    <div className="workspace-details-title">{detailGroups[2].title}</div>
                    <p className="workspace-details-copy">{detailGroups[2].description}</p>
                  </div>
                </summary>
                <div className="workspace-details-body">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Results availability</div>
                    <div className="flex flex-wrap gap-2">
                      {binaryOptions.map((option) => {
                        const isActive = (filters.hasResults || '') === option.value;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => setTextField('hasResults', option.value)}
                            className={`workspace-chip ${isActive ? 'workspace-chip-active' : ''}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleBooleanFilter('hasProtocol')}
                      className={`workspace-chip ${filters.hasProtocol ? 'workspace-chip-active' : ''}`}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      Protocol
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBooleanFilter('hasSAP')}
                      className={`workspace-chip ${filters.hasSAP ? 'workspace-chip-active' : ''}`}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      SAP
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBooleanFilter('hasICF')}
                      className={`workspace-chip ${filters.hasICF ? 'workspace-chip-active' : ''}`}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      ICF
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBooleanFilter('fdaaa801Violation')}
                      className={`workspace-chip ${filters.fdaaa801Violation ? 'workspace-chip-active' : ''}`}
                    >
                      FDAAA 801 flag
                    </button>
                  </div>

                  <label className="workspace-field">
                    <span className="workspace-label">
                      <MessageIcon className="h-4 w-4 text-amber-600" />
                      Outcome measure
                    </span>
                    <input
                      type="text"
                      value={filters.outcome || ''}
                      onChange={(event) => setTextField('outcome', event.target.value)}
                      placeholder="Progression-free survival, HbA1c, overall response rate..."
                      className="workspace-input"
                    />
                  </label>
                </div>
              </details>

              <details className="workspace-details">
                <summary>
                  <div>
                    <div className="workspace-details-title">{detailGroups[3].title}</div>
                    <p className="workspace-details-copy">{detailGroups[3].description}</p>
                  </div>
                </summary>
                <div className="workspace-details-body">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Funder type</div>
                    <div className="flex flex-wrap gap-2">
                      {funderTypeOptions.map((option) => {
                        const isActive = filters.funderType?.includes(option.value) || false;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleArrayFilter('funderType', option.value)}
                            className={`workspace-chip ${isActive ? 'workspace-chip-active' : ''}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="workspace-field">
                      <span className="workspace-label">
                        <CalendarIcon className="h-4 w-4 text-sky-600" />
                        Study start from
                      </span>
                      <input
                        type="date"
                        value={filters.studyStartFrom || ''}
                        onChange={(event) => setTextField('studyStartFrom', event.target.value)}
                        className="workspace-input"
                      />
                    </label>
                    <label className="workspace-field">
                      <span className="workspace-label">
                        <CalendarIcon className="h-4 w-4 text-sky-600" />
                        Study start to
                      </span>
                      <input
                        type="date"
                        value={filters.studyStartTo || ''}
                        onChange={(event) => setTextField('studyStartTo', event.target.value)}
                        className="workspace-input"
                      />
                    </label>
                    <label className="workspace-field">
                      <span className="workspace-label">
                        <CalendarIcon className="h-4 w-4 text-emerald-600" />
                        Primary completion from
                      </span>
                      <input
                        type="date"
                        value={filters.primaryCompletionFrom || ''}
                        onChange={(event) => setTextField('primaryCompletionFrom', event.target.value)}
                        className="workspace-input"
                      />
                    </label>
                    <label className="workspace-field">
                      <span className="workspace-label">
                        <CalendarIcon className="h-4 w-4 text-emerald-600" />
                        Primary completion to
                      </span>
                      <input
                        type="date"
                        value={filters.primaryCompletionTo || ''}
                        onChange={(event) => setTextField('primaryCompletionTo', event.target.value)}
                        className="workspace-input"
                      />
                    </label>
                  </div>
                </div>
              </details>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={handleSearch} disabled={loading} className="workspace-button-primary sm:flex-1">
              <SearchIcon className="h-4 w-4" />
              {loading ? 'Searching clinical trials...' : 'Search trials'}
            </button>
            <button type="button" onClick={openAnalyst} className="workspace-button-secondary sm:flex-1">
              <MessageIcon className="h-4 w-4" />
              Open AI analyst
            </button>
            <button type="button" onClick={handleClear} className="workspace-button-ghost">
              Clear
            </button>
          </div>

          <div className="rounded-[24px] border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <CheckCircleIcon className="h-4 w-4 text-sky-600" />
              Conversation-first workflow
            </div>
            <p className="mt-1 leading-6">
              Search to create a working set, then open the AI analyst to ask follow-up questions about the filtered studies
              without leaving the page.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
