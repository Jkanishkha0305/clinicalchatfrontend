'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadUserFromStorage } from '@/store/slices/authSlice';
import { clearAllStudyChatMessages, clearMessages, clearReports } from '@/store/slices/chatSlice';
import { fetchPreferences, fetchSettings } from '@/store/slices/preferencesSlice';
import { clearResults, setFilters } from '@/store/slices/searchSlice';
import { emptyFilters } from '@/lib/searchConfig';
import Sidebar from './Sidebar';
import SearchForm from './SearchForm';
import Results from './Results';
import FloatingChat from './FloatingChat';
import SearchModal from './SearchModal';
import SettingsModal from './SettingsModal';
import StudyChatModal from './StudyChatModal';
import ReportModal from './ReportModal';
import ProtocolDesigner from './ProtocolDesigner';
import AgentsPanel from './AgentsPanel';
import {
  ActivityIcon,
  ArrowRightIcon,
  BotIcon,
  ChartIcon,
  CloseIcon,
  FileTextIcon,
  MenuIcon,
  SearchIcon,
  SparklesIcon,
} from '@/components/ui/icons';

type WorkspaceTab = 'search' | 'protocol' | 'agents';

const tabMeta: Record<
  WorkspaceTab,
  {
    label: string;
    title: string;
    description: string;
    icon: typeof SearchIcon;
  }
> = {
  search: {
    label: 'Discover',
    title: 'Discover trials with a concise brief.',
    description: 'Lead with intent, refine only when needed, and keep search plus follow-up analysis in one flow.',
    icon: SearchIcon,
  },
  protocol: {
    label: 'Generate',
    title: 'Generate protocol direction in a focused studio.',
    description: 'Move from broad trial discovery into evidence-based protocol generation without leaving the workspace.',
    icon: FileTextIcon,
  },
  agents: {
    label: 'Agents',
    title: 'Run specialized agents when deeper analysis matters.',
    description: 'Use heavier multi-agent workflows for amendment risk, design synthesis, schedule building, and comparison.',
    icon: BotIcon,
  },
};

const tabOrder: WorkspaceTab[] = ['search', 'protocol', 'agents'];

export default function MainApp() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('search');
  const { user } = useAppSelector((state) => state.auth);
  const { sessions, currentSessionId } = useAppSelector((state) => state.sessions);
  const { total } = useAppSelector((state) => state.search);
  const [userLoaded, setUserLoaded] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    dispatch(loadUserFromStorage());
    setUserLoaded(true);
  }, [dispatch]);

  useEffect(() => {
    if (userLoaded && user && !user.is_guest) {
      dispatch(fetchPreferences());
      dispatch(fetchSettings());
    }
  }, [dispatch, user, userLoaded]);

  useEffect(() => {
    if (!userLoaded) {
      return;
    }

    if (
      user === null &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/auth/login' &&
      window.location.pathname !== '/auth/signup'
    ) {
      router.push('/auth/login');
    }
  }, [router, user, userLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const isMobile = window.innerWidth < 1024;
    if (isMobile && isMobileSidebarOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }

    return undefined;
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    const handleOpenReportModal = () => setIsReportModalOpen(true);
    window.addEventListener('openReportModal', handleOpenReportModal);
    return () => {
      window.removeEventListener('openReportModal', handleOpenReportModal);
    };
  }, []);

  const handleResetWorkspace = () => {
    dispatch(setFilters(emptyFilters));
    dispatch(clearResults());
    dispatch(clearMessages());
    dispatch(clearAllStudyChatMessages());
    dispatch(clearReports());
  };

  const currentSession = sessions.find((session) => session.id === currentSessionId);
  const currentHero = tabMeta[activeTab];
  const HeroIcon = currentHero.icon;

  return (
    <div className="relative min-h-[100dvh] text-slate-100">
      {user && !user.is_guest ? (
        <>
          <div
            className={`fixed inset-0 z-40 bg-[rgba(2,8,23,0.62)] backdrop-blur-sm transition-opacity lg:hidden ${
              isMobileSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div
            className={`fixed left-0 top-0 z-50 h-[100dvh] transition-transform duration-300 ease-out lg:z-30 lg:translate-x-0 ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar
              onOpenSearchModal={() => {
                setIsSearchModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onClose={() => setIsMobileSidebarOpen(false)}
              onCollapsedChange={(collapsed) => setIsSidebarCollapsed(collapsed)}
            />
          </div>
        </>
      ) : null}

      <div
        className={`relative flex min-h-[100dvh] flex-col transition-all duration-300 ${
          user && !user.is_guest ? (isSidebarCollapsed ? 'lg:ml-[60px]' : 'lg:ml-[280px]') : ''
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(7,12,22,0.72)] backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              {user && !user.is_guest ? (
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-white lg:hidden"
                  aria-label="Open sidebar"
                >
                  <MenuIcon className="h-5 w-5" />
                </button>
              ) : null}

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_20px_40px_rgba(14,165,233,0.14)]">
                <SparklesIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                  Clinical intelligence workspace
                </div>
                <div className="mt-1 truncate text-base font-semibold text-white sm:text-lg">
                  {currentSession?.title || 'New workspace'}
                </div>
                <p className="mt-1 max-w-2xl text-xs text-slate-400 sm:text-sm">
                  {currentSession?.description ||
                    'Chat-first discovery for clinical trials, protocol design, and evidence review.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleResetWorkspace} className="workspace-button-ghost-dark">
                <CloseIcon className="h-4 w-4" />
                New workspace
              </button>

              {user?.is_guest ? (
                <>
                  <a href="/auth/login" className="workspace-button-ghost-dark no-underline">
                    Sign in
                  </a>
                  <a href="/auth/signup" className="workspace-button-primary no-underline">
                    Create account
                  </a>
                </>
              ) : (
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  {sessions.length} saved sessions
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
            <section className="workspace-panel overflow-hidden">
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_320px] lg:items-end">
                <div>
                  <div className="workspace-kicker">
                    <HeroIcon className="h-4 w-4" />
                    {currentHero.label}
                  </div>
                  <h1 className="mt-3 max-w-3xl text-[1.85rem] font-semibold tracking-tight text-white sm:text-[2.75rem] sm:leading-[1.08]">
                    {currentHero.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[0.95rem]">
                    {currentHero.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="workspace-chip-dark">Prompt-first discovery</span>
                    <span className="workspace-chip-dark">Progressive filters</span>
                    <span className="workspace-chip-dark">Study-level chat</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="workspace-metric-card">
                    <SearchIcon className="h-5 w-5 text-cyan-200" />
                    <div>
                      <div className="workspace-metric-title">Natural-language search</div>
                      <p>Start broad, then tighten with structured controls only when the brief needs it.</p>
                    </div>
                  </div>
                  {/* <div className="workspace-metric-card">
                    <ChartIcon className="h-5 w-5 text-cyan-200" />
                    <div>
                      <div className="workspace-metric-title">Live result set</div>
                      <p>{total.toLocaleString()} studies are currently in your working set.</p>
                    </div>
                  </div> */}
                  <div className="workspace-metric-card">
                    <BotIcon className="h-5 w-5 text-cyan-200" />
                    <div>
                      <div className="workspace-metric-title">AI follow-up layer</div>
                      <p>Move directly from discovery into analysis without context switching.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 px-4 pb-4 sm:px-6 sm:pb-5">
                <div className="flex flex-wrap gap-2 pt-3">
                  {tabOrder.map((tab) => {
                    const isActive = activeTab === tab;
                    const TabIcon = tabMeta[tab].icon;

                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`workspace-tab ${isActive ? 'workspace-tab-active' : ''}`}
                      >
                        <TabIcon className="h-4 w-4" />
                        <span>{tabMeta[tab].label}</span>
                        {isActive ? <ArrowRightIcon className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {activeTab === 'search' ? (
              <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
                <div className="xl:sticky xl:top-24">
                  <SearchForm />
                </div>
                <Results />
              </div>
            ) : activeTab === 'protocol' ? (
              <section className="workspace-panel-light p-2 sm:p-4">
                <ProtocolDesigner key={currentSessionId || 'no-session'} />
              </section>
            ) : (
              <section className="workspace-panel-light p-2 sm:p-4">
                <AgentsPanel />
              </section>
            )}
          </div>
        </main>
      </div>

      <FloatingChat />
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
      <SettingsModal />
      <StudyChatModal />
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
}
