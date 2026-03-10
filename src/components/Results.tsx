'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCurrentStudy } from '@/store/slices/chatSlice';
import { setCurrentSession, updateSessionFromChat } from '@/store/slices/sessionsSlice';
import { setPage, setPerPage } from '@/store/slices/searchSlice';
import { useSearchMutation } from '@/hooks/useSearchQuery';
import { activeFilterCount } from '@/lib/searchConfig';
import {
  ActivityIcon,
  ArrowUpRightIcon,
  BuildingIcon,
  ChartIcon,
  CheckCircleIcon,
  FileTextIcon,
  MessageIcon,
  SearchIcon,
  SparklesIcon,
} from '@/components/ui/icons';

const statusToneMap: Record<string, string> = {
  RECRUITING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ACTIVE_NOT_RECRUITING: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
  TERMINATED: 'bg-rose-50 text-rose-700 border-rose-200',
  SUSPENDED: 'bg-orange-50 text-orange-700 border-orange-200',
};

const perPageOptions = [10, 20, 50, 100];

export default function Results() {
  const dispatch = useAppDispatch();
  const { results, total, page, perPage, totalPages, filters, loading, searchType } = useAppSelector((state) => state.search);
  const { currentSessionId } = useAppSelector((state) => state.sessions);
  const searchMutation = useSearchMutation();

  const openAnalyst = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openFloatingChat'));
    }
  };

  const syncSessionFromResult = (result: {
    sessionInfo?: {
      sessionId: string;
      session?: {
        id?: string;
        title?: string;
        description?: string;
      };
    };
  }) => {
    const sessionInfo = result.sessionInfo;
    const session = sessionInfo?.session;
    const sessionId = sessionInfo?.sessionId || session?.id;

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
  };

  const runSearchPage = async (nextPage: number, nextPerPage: number) => {
    if (!filters) {
      return;
    }

    try {
      const result = await searchMutation({
        filters,
        page: nextPage,
        perPage: nextPerPage,
        sessionId: currentSessionId || undefined,
        syncToRedux: true,
      });
      syncSessionFromResult(result);
    } catch (error) {
      if (error !== 'Request aborted') {
        console.error('Search failed:', error);
      }
    }
  };

  const handlePerPageChange = async (nextPerPage: number) => {
    dispatch(setPerPage(nextPerPage));
    await runSearchPage(1, nextPerPage);
  };

  const handlePageChange = async (nextPage: number) => {
    dispatch(setPage(nextPage));
    await runSearchPage(nextPage, perPage);
  };

  const openStudyChat = (nctId: string) => {
    dispatch(setCurrentStudy(nctId));
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.style.display = 'block';
    }
  };

  const hasContext = activeFilterCount(filters) > 0;

  return (
    <section className="workspace-panel-light min-h-[560px] overflow-hidden">
      <div className="border-b border-slate-200/80 p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="workspace-kicker workspace-kicker-light">
              <ChartIcon className="h-4 w-4" />
              Results workspace
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              {loading ? 'Refreshing your study set...' : `${total.toLocaleString()} studies in view`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review the current result set, open any study for focused chat, or jump into the AI analyst to ask about the
              filtered portfolio as a whole.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="workspace-chip workspace-chip-muted">
                {filters?.useSemanticSearch ? <SparklesIcon className="h-3.5 w-3.5" /> : <SearchIcon className="h-3.5 w-3.5" />}
                {filters?.useSemanticSearch ? 'Semantic discovery' : 'Structured keyword search'}
              </span>
              <span className="workspace-chip workspace-chip-muted">
                <ActivityIcon className="h-3.5 w-3.5" />
                {activeFilterCount(filters)} active filters
              </span>
              {filters?.query ? (
                <span className="workspace-chip workspace-chip-muted">
                  <FileTextIcon className="h-3.5 w-3.5" />
                  Brief attached
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              Results per page
              <select
                value={perPage}
                disabled={loading}
                onChange={(event) => handlePerPageChange(Number(event.target.value))}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-900 outline-none focus:border-sky-400"
              >
                {perPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={openAnalyst} className="workspace-button-secondary">
              <MessageIcon className="h-4 w-4" />
              Ask AI analyst
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: Math.min(perPage, 6) }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-5 w-2/3 rounded-full bg-slate-200" />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="h-20 rounded-2xl bg-slate-100" />
                  <div className="h-20 rounded-2xl bg-slate-100" />
                  <div className="h-20 rounded-2xl bg-slate-100" />
                </div>
                <div className="mt-4 h-10 w-40 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="workspace-empty-state">
            <div className="workspace-empty-icon">
              <SearchIcon className="h-6 w-6" />
            </div>
            <h3>{hasContext ? 'No studies matched this view' : 'Build your first study set'}</h3>
            <p>
              {hasContext
                ? 'Try broadening the brief, relaxing phase or status constraints, or removing timeline limits.'
                : 'Use the prompt-first search panel to describe the study landscape you want, then refine with chips only when needed.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="workspace-chip workspace-chip-muted">Natural-language prompts</span>
              <span className="workspace-chip workspace-chip-muted">Progressive filters</span>
              <span className="workspace-chip workspace-chip-muted">Study-level chat</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((study) => {
              const protocol = study.protocolSection;
              const identification = protocol.identificationModule;
              const status = protocol.statusModule;
              const design = protocol.designModule;
              const sponsor = protocol.sponsorCollaboratorsModule?.leadSponsor?.name || 'Sponsor not listed';
              const phaseLabel = design.phases?.join(', ') || 'Phase not available';
              const statusTone = statusToneMap[status.overallStatus] || 'bg-slate-50 text-slate-700 border-slate-200';

              const matchStory = [
                filters?.query ? 'aligned to your natural-language brief' : '',
                filters?.condition ? `condition ${filters.condition}` : '',
                filters?.intervention ? `intervention ${filters.intervention}` : '',
                filters?.location ? `location ${filters.location}` : '',
              ]
                .filter(Boolean)
                .join(' • ');

              return (
                <article
                  key={identification.nctId}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_50px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_64px_rgba(15,23,42,0.12)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
                          {status.overallStatus.replaceAll('_', ' ')}
                        </span>
                        <span className="workspace-chip workspace-chip-muted">{design.studyType}</span>
                        <span className="workspace-chip workspace-chip-muted">{phaseLabel}</span>
                      </div>

                      <h3 className="mt-4 text-xl font-semibold leading-8 text-slate-950">
                        {identification.briefTitle || 'Untitled study'}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">{identification.nctId}</p>
                      {matchStory ? <p className="mt-3 text-sm leading-6 text-slate-600">Match context: {matchStory}</p> : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => window.open(`https://clinicaltrials.gov/study/${identification.nctId}`, '_blank', 'noopener,noreferrer')}
                      className="workspace-button-ghost shrink-0"
                    >
                      <ArrowUpRightIcon className="h-4 w-4" />
                      Open source
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <BuildingIcon className="h-4 w-4" />
                        Sponsor
                      </div>
                      <p className="mt-3 text-sm font-medium leading-6 text-slate-800">{sponsor}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <ActivityIcon className="h-4 w-4" />
                        Trial design
                      </div>
                      <p className="mt-3 text-sm font-medium leading-6 text-slate-800">
                        {design.studyType} {design.phases?.length ? `• ${phaseLabel}` : ''}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <CheckCircleIcon className="h-4 w-4" />
                        Evidence
                      </div>
                      <p className="mt-3 text-sm font-medium leading-6 text-slate-800">
                        {study.hasResults ? 'Results available' : 'Results not posted'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => openStudyChat(identification.nctId)}
                      className="workspace-button-primary"
                    >
                      <MessageIcon className="h-4 w-4" />
                      Ask about this study
                    </button>
                    <button
                      type="button"
                      onClick={openAnalyst}
                      className="workspace-button-secondary"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      Ask about this cohort
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && !loading ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
              className="workspace-chip workspace-chip-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, index) => Math.max(1, page - 3) + index)
              .filter((pageNumber) => pageNumber <= totalPages)
              .map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => handlePageChange(pageNumber)}
                  className={`workspace-chip ${pageNumber === page ? 'workspace-chip-active' : 'workspace-chip-muted'}`}
                >
                  {pageNumber}
                </button>
              ))}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="workspace-chip workspace-chip-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
