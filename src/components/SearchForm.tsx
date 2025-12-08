'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { searchStudies, clearResults, setFilters as setFiltersAction } from '@/store/slices/searchSlice';
import { updateSessionFromChat, setCurrentSession } from '@/store/slices/sessionsSlice';
import { SearchFilters } from '@/lib/types';
import { useSearchMutation } from '@/hooks/useSearchQuery';
import { Select, DatePicker } from 'antd';
import dayjs from 'dayjs';

const datePickerStyles = `
  .date-picker-blue .ant-picker {
    border-radius: 0.5rem !important;
    border-color: #d1d5db !important;
    transition: all 0.2s !important;
    width: 100% !important;
    padding: 0.5rem 0.75rem !important;
  }
  .date-picker-blue .ant-picker:hover {
    border-color: #9ca3af !important;
  }
  .date-picker-blue .ant-picker-focused {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  }
  
  .date-picker-green .ant-picker {
    border-radius: 0.5rem !important;
    border-color: #d1d5db !important;
    transition: all 0.2s !important;
    width: 100% !important;
    padding: 0.5rem 0.75rem !important;
  }
  .date-picker-green .ant-picker:hover {
    border-color: #9ca3af !important;
  }
  .date-picker-green .ant-picker-focused {
    border-color: #22c55e !important;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2) !important;
  }
  
  .ant-picker-input > input {
    font-size: 0.875rem !important;
  }
`;

const selectStyles = `
  /* Status Select - Blue */
  .status-select .ant-select-selector {
    border-radius: 0.5rem !important;
    border-color: #d1d5db !important;
    transition: all 0.2s !important;
    min-height: 38px !important;
    padding: 2px 11px !important;
  }
  .status-select .ant-select-selector:hover {
    border-color: #9ca3af !important;
  }
  .status-select.ant-select-focused .ant-select-selector {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  }
  
  /* Type Select - Green */
  .type-select .ant-select-selector {
    border-radius: 0.5rem !important;
    border-color: #d1d5db !important;
    transition: all 0.2s !important;
    min-height: 38px !important;
    padding: 2px 11px !important;
  }
  .type-select .ant-select-selector:hover {
    border-color: #9ca3af !important;
  }
  .type-select.ant-select-focused .ant-select-selector {
    border-color: #22c55e !important;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2) !important;
  }
  
  /* Phase Select - Purple */
  .phase-select .ant-select-selector {
    border-radius: 0.5rem !important;
    border-color: #d1d5db !important;
    transition: all 0.2s !important;
    min-height: 38px !important;
    padding: 2px 11px !important;
  }
  .phase-select .ant-select-selector:hover {
    border-color: #9ca3af !important;
  }
  .phase-select.ant-select-focused .ant-select-selector {
    border-color: #a855f7 !important;
    box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2) !important;
  }
  
  /* Funder Select - Cyan */
  .funder-select .ant-select-selector {
    border-radius: 0.5rem !important;
    border-color: #d1d5db !important;
    transition: all 0.2s !important;
    min-height: 38px !important;
    padding: 2px 11px !important;
  }
  .funder-select .ant-select-selector:hover {
    border-color: #9ca3af !important;
  }
  .funder-select.ant-select-focused .ant-select-selector {
    border-color: #06b6d4 !important;
    box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2) !important;
  }
  
  /* Multi-select specific styles */
  .ant-select-multiple .ant-select-selection-item {
    border-radius: 0.375rem !important;
    font-size: 0.75rem !important;
    line-height: 1.5 !important;
    margin: 2px 4px 2px 0 !important;
    padding: 0 8px !important;
    height: 22px !important;
  }
  
  /* Ensure placeholder and single value alignment */
  .ant-select-selection-placeholder,
  .ant-select-selection-item {
    line-height: 34px !important;
  }
  
  /* For multiple mode when empty */
  .ant-select-multiple .ant-select-selection-placeholder {
    line-height: 34px !important;
  }
  
  /* Adjust search input inside multi-select */
  .ant-select-multiple .ant-select-selection-search-input {
    height: 30px !important;
  }
`;
// Initialize with empty filters (moved outside component to avoid re-creation)
const emptyFilters: SearchFilters = {
  condition: '',
  intervention: '',
  location: '',
  status: [] as string[],
  studyType: [] as string[],
  phase: [] as string[],
  sex: '',
  ageGroups: [] as string[],
  healthyVolunteers: false,
  hasResults: '',
  hasProtocol: false,
  hasSAP: false,
  hasICF: false,
  funderType: [] as string[],
  studyStartFrom: '',
  studyStartTo: '',
  primaryCompletionFrom: '',
  primaryCompletionTo: '',
  title: '',
  outcome: '',
  sponsor: '',
  nctId: '',
  fdaaa801Violation: false,
  useSemanticSearch: false,
  maxSemanticResults: 1000,
  query: '', // Natural language query for semantic search
};

export default function SearchForm() {
  const dispatch = useAppDispatch();
  const { filters: currentFilters, loading } = useAppSelector((state) => state.search);
  const { currentSessionId, loading: sessionsLoading } = useAppSelector((state) => state.sessions);
  const searchMutation = useSearchMutation();

  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);

  // Sync local state with Redux state when currentFilters changes (e.g., when loading a session)
  useEffect(() => {
    // Use a timeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      if (currentFilters) {
        setFilters(currentFilters);
      } else {
        setFilters(emptyFilters);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [currentFilters]);
  console.log('Rendering SearchForm with filters:', currentFilters);

  // Show skeleton when:
  // 1. Loading a session (has sessionId but filters not loaded yet) - first API call
  // 2. Search is in progress (second API call) - even if filters exist
  // Don't show skeleton for new chats (no sessionId) - show empty form instead
  const showSkeleton = sessionsLoading;

  if (showSkeleton) {
    return (
      <div className="bg-white p-7 sm:p-6 rounded-lg mb-5 shadow-[0_2px_4px_rgba(0,0,0,0.1)] animate-pulse">
        <div className="mb-6">
          <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded" />
          </div>
        </div>

        <div className="mb-6">
          <div className="h-6 w-56 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-24 bg-slate-200 rounded" />
            <div className="h-24 bg-slate-200 rounded" />
            <div className="h-24 bg-slate-200 rounded" />
          </div>
        </div>

        <div className="mb-6">
          <div className="h-6 w-44 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-32 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200 rounded" />
          </div>
        </div>

        <div className="mb-6">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded" />
          </div>
        </div>

        <div className="mb-6">
          <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded" />
          </div>
        </div>

        <div className="mt-5 flex gap-2.5 flex-col sm:flex-row">
          <div className="h-12 w-32 bg-slate-200 rounded" />
          <div className="h-12 w-32 bg-slate-200 rounded" />
          <div className="h-12 w-48 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }
  const handleSearch = async () => {
    // Now we use the controlled filters state directly
    dispatch(setFiltersAction(filters));
    
    // Use cached search mutation - this will check cache first
    // If cached, returns immediately; otherwise fetches and caches
    try {
      const result = await searchMutation({
        filters,
        page: 1,
        sessionId: currentSessionId || undefined,
        syncToRedux: true,
      });
      
      // Handle session info from response
      if (result?.sessionInfo) {
        const sessionInfo = result.sessionInfo;
        const session = sessionInfo.session;
        const sessionId = sessionInfo.sessionId || session?.id;
        
        if (sessionId) {
          dispatch(updateSessionFromChat({
            sessionId,
            title: session?.title || 'New Chat',
            description: session?.description || '',
          }));
          dispatch(setCurrentSession(sessionId));
        }
      }
    } catch (error: any) {
      // Ignore abort errors
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

  return (
    <div className="">
      {/* Semantic Search Text Field - Above all filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-2 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="text-center mb-4">
          <h3 className="text-gray-800 text-base font-semibold">
            Natural Language Search
          </h3>
        </div>
        <div className="w-full h-[1px] mb-4 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
        <div className="flex flex-col">
          <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Describe what you're looking for
            <span className="text-xs text-gray-500 font-normal">(e.g., "lung cancer phase 3 trials after may 2024")</span>
          </label>
          <textarea
            id="semanticQuery"
            placeholder="Enter your search query in natural language. You can describe conditions, phases, dates, and more. Example: 'Search me all the clinical trials about lung cancer for only phase1 that comes after the may 5 2024'"
            value={filters.query || ''}
            onChange={(e) => {
              const queryText = e.target.value;
              // Auto-enable semantic search when text is entered, disable when cleared
              const updatedFilters = {
                ...filters,
                query: queryText,
                useSemanticSearch: queryText.trim().length > 0, // Auto-check semantic search when text exists
                ...(queryText.trim().length > 0 && {maxSemanticResults: 30000})
              };
              setFilters(updatedFilters);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400 min-h-[100px] resize-y"
            rows={3}
          />
          {filters.query && filters.query.trim().length > 0 && (
            <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1">
              <span>✓</span>
              <span>Semantic search is automatically enabled when you enter text</span>
            </div>
          )}
        </div>
      </div>

      {/* BASIC SEARCH */}
      <div className="b border border-gray-200 rounded-xl p-5 mb-2 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="text-center mb-4">
          <h3 className="text-gray-800 text-base font-semibold">
            Basic Search
          </h3>
        </div>

        <div className="w-full h-[1px] mb-4 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          
          <div className="flex flex-col">
            <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Condition or Disease
            </label>
            <input
              type="text"
              placeholder="e.g., Cancer, Diabetes"
              value={filters.condition ?? ""}
              onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Intervention/Treatment
            </label>
            <input
              type="text"
              placeholder="e.g., Drug name"
              value={filters.intervention ?? ""}
              onChange={(e) => setFilters({ ...filters, intervention: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location
            </label>
            <input
              type="text"
              placeholder="Country, City, State"
              value={filters.location ?? ""}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
            />
          </div>

        </div>
      </div>

{/* STUDY STATUS & TYPE */}
<div className="bg-white border border-gray-200 rounded-xl p-5 mb-2 shadow-sm hover:shadow-md transition-shadow duration-300">
  <style>{selectStyles}</style>
  
  <div className="text-center mb-4">
    <h3 className="text-gray-800 text-base font-semibold">
      Study Status and Type
    </h3>
  </div>

  <div className="w-full h-[1px] mb-4 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    
    {/* Study Status - Multi-select */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Study Status
      </label>
      <Select
        mode="multiple"
        placeholder="Select status"
        value={filters.status || []}
        onChange={(selected) => setFilters({ ...filters, status: selected })}
        className="status-select"
        style={{ width: '100%' }}
        size="middle"
        maxTagCount="responsive"
        options={[
          { value: "RECRUITING", label: "Recruiting" },
          { value: "NOT_YET_RECRUITING", label: "Not yet recruiting" },
          { value: "ACTIVE_NOT_RECRUITING", label: "Active, not recruiting" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ENROLLING_BY_INVITATION", label: "Enrolling by invitation" },
          { value: "SUSPENDED", label: "Suspended" },
          { value: "TERMINATED", label: "Terminated" },
          { value: "WITHDRAWN", label: "Withdrawn" }
        ]}
      />
    </div>

    {/* Study Type - Multi-select */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Study Type
      </label>
      <Select
        mode="multiple"
        placeholder="Select type"
        value={filters.studyType || []}
        onChange={(selected) => setFilters({ ...filters, studyType: selected })}
        className="type-select"
        style={{ width: '100%' }}
        size="middle"
        maxTagCount="responsive"
        options={[
          { value: "INTERVENTIONAL", label: "Interventional" },
          { value: "OBSERVATIONAL", label: "Observational" },
          { value: "EXPANDED_ACCESS", label: "Expanded Access" }
        ]}
      />
    </div>

    {/* Study Phase - Multi-select */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Study Phase
      </label>
      <Select
        mode="multiple"
        placeholder="Select phase"
        value={filters.phase || []}
        onChange={(selected) => setFilters({ ...filters, phase: selected })}
        className="phase-select"
        style={{ width: '100%' }}
        size="middle"
        maxTagCount="responsive"
        options={[
          { value: "EARLY_PHASE1", label: "Early Phase 1" },
          { value: "PHASE1", label: "Phase 1" },
          { value: "PHASE2", label: "Phase 2" },
          { value: "PHASE3", label: "Phase 3" },
          { value: "PHASE4", label: "Phase 4" },
          { value: "NA", label: "Not Applicable" }
        ]}
      />
    </div>

  </div>
</div>

<div className="bg-white border border-gray-200 rounded-xl p-5 mb-2 shadow-sm hover:shadow-md transition-shadow duration-300">
  <div className="text-center mb-4">
    <h3 className="text-gray-800 text-base font-semibold">
      Eligibility Criteria
    </h3>
  </div>

  <div className="w-full h-[1px] mb-4 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

    {/* Gender Dropdown */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Gender
      </label>
      <div className="relative">
        <select
          value={filters.sex ?? ""}
          onChange={(e) => setFilters({ ...filters, sex: e.target.value })}
          className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent 
                   transition-all duration-200 bg-white hover:border-gray-400 appearance-none cursor-pointer"
        >
          <option value="">All</option>
          <option value="FEMALE">Female</option>
          <option value="MALE">Male</option>
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    {/* Age Groups Checkboxes */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Age Groups
      </label>
      <div className="border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-gray-400 transition-all duration-200">
        <div className="flex flex-col gap-2">
          {[
            { key: "CHILD", label: "Child (birth – 17)" },
            { key: "ADULT", label: "Adult (18 – 64)" },
            { key: "OLDER_ADULT", label: "Older Adult (65+)" }
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.ageGroups?.includes(item.key) || false}
                onChange={(e) => {
                  const arr = filters.ageGroups || [];
                  setFilters({
                    ...filters,
                    ageGroups: e.target.checked
                      ? [...arr, item.key]
                      : arr.filter((v) => v !== item.key),
                  });
                }}
                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 cursor-pointer"
              />
              <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>

    {/* Accepts Healthy Volunteers */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Accepts Healthy Volunteers
      </label>
      <div className="border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-gray-400 transition-all duration-200 flex items-center min-h-[50px]">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            id="healthyVolunteers"
            checked={filters.healthyVolunteers || false}
            onChange={(e) => setFilters({ ...filters, healthyVolunteers: e.target.checked })}
            className="w-4 h-4 text-teal-500 border-gray-300 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
          />
          <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
            Yes, accepts healthy volunteers
          </span>
        </label>
      </div>
    </div>

  </div>
</div>

<div className="bg-white border border-gray-200 rounded-xl p-5 mb-2 shadow-sm hover:shadow-md transition-shadow duration-300">
  <style>{selectStyles}</style>
  
  <div className="text-center mb-4">
    <h3 className="text-gray-800 text-base font-semibold">
      Study Results & Documents
    </h3>
  </div>

  <div className="w-full h-[1px] mb-4 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
  
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

    {/* Study Results */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Study Results
      </label>
      <div className="relative">
        <select
          value={filters.hasResults ?? ""}
          onChange={(e) => setFilters({ ...filters, hasResults: e.target.value })}
          className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent 
                   transition-all duration-200 bg-white hover:border-gray-400 appearance-none cursor-pointer"
        >
          <option value="">Any</option>
          <option value="true">With results</option>
          <option value="false">Without results</option>
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    {/* Study Documents */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Study Documents
      </label>
      <div className="border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-gray-400 transition-all duration-200">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.hasProtocol || false}
              onChange={(e) =>
                setFilters({ ...filters, hasProtocol: e.target.checked })
              }
              className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
              Study Protocol
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.hasSAP || false}
              onChange={(e) =>
                setFilters({ ...filters, hasSAP: e.target.checked })
              }
              className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
              Statistical Analysis Plan (SAP)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.hasICF || false}
              onChange={(e) =>
                setFilters({ ...filters, hasICF: e.target.checked })
              }
              className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
              Informed Consent Form (ICF)
            </span>
          </label>
        </div>
      </div>
    </div>

    {/* Funder Type - Multi-select */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Funder Type
      </label>
      <Select
        mode="multiple"
        placeholder="Select funder type"
        value={filters.funderType || []}
        onChange={(selected) => setFilters({ ...filters, funderType: selected })}
        className="funder-select"
        style={{ width: '100%' }}
        size="middle"
        maxTagCount="responsive"
        options={[
          { value: "NIH", label: "NIH" },
          { value: "FED", label: "Other Federal Agency" },
          { value: "INDUSTRY", label: "Industry" },
          { value: "OTHER", label: "All Others" }
        ]}
      />
    </div>

  </div>
</div>
      

<div className="bg-white border border-gray-200 rounded-xl p-5 mb-2 shadow-sm hover:shadow-md transition-shadow duration-300">
  <style>{datePickerStyles}</style>
  
  <div className="text-center mb-4">
    <h3 className="text-gray-800 text-base font-semibold">
      Date Ranges
    </h3>
  </div>

  <div className="w-full h-[1px] mb-4 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

    {/* Study Start From */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Study Start From
      </label>
      <DatePicker
        value={filters.studyStartFrom ? dayjs(filters.studyStartFrom) : null}
        onChange={(date) => {
          setFilters({ 
            ...filters, 
            studyStartFrom: date ? date.format('YYYY-MM-DD') : '' 
          });
        }}
        placeholder="Select date"
        className="date-picker-blue"
        size="middle"
        format="YYYY-MM-DD"
      />
    </div>

    {/* Study Start To */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Study Start To
      </label>
      <DatePicker
        value={filters.studyStartTo ? dayjs(filters.studyStartTo) : null}
        onChange={(date) => {
          setFilters({ 
            ...filters, 
            studyStartTo: date ? date.format('YYYY-MM-DD') : '' 
          });
        }}
        placeholder="Select date"
        className="date-picker-blue"
        size="middle"
        format="YYYY-MM-DD"
      />
    </div>

    {/* Primary Completion From */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Primary Completion From
      </label>
      <DatePicker
        value={filters.primaryCompletionFrom ? dayjs(filters.primaryCompletionFrom) : null}
        onChange={(date) => {
          setFilters({ 
            ...filters, 
            primaryCompletionFrom: date ? date.format('YYYY-MM-DD') : '' 
          });
        }}
        placeholder="Select date"
        className="date-picker-green"
        size="middle"
        format="YYYY-MM-DD"
      />
    </div>

    {/* Primary Completion To */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Primary Completion To
      </label>
      <DatePicker
        value={filters.primaryCompletionTo ? dayjs(filters.primaryCompletionTo) : null}
        onChange={(date) => {
          setFilters({ 
            ...filters, 
            primaryCompletionTo: date ? date.format('YYYY-MM-DD') : '' 
          });
        }}
        placeholder="Select date"
        className="date-picker-green"
        size="middle"
        format="YYYY-MM-DD"
      />
    </div>

  </div>
</div>
      
<div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm hover:shadow-md transition-shadow duration-300">
  <div className="text-center mb-4">
    <h3 className="text-gray-800 text-base font-semibold">
      More Ways to Search
    </h3>
  </div>

  <div className="w-full h-[1px] mb-4 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

    {/* Title or Acronym */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        Title or Acronym
      </label>
      <input
        type="text"
        placeholder="Search in study titles"
        value={filters.title ?? ""}
        onChange={(e) => setFilters({ ...filters, title: e.target.value })}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
      />
    </div>

    {/* Outcome Measure */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Outcome Measure
      </label>
      <input
        type="text"
        placeholder="Primary or secondary outcome"
        value={filters.outcome ?? ""}
        onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
      />
    </div>

    {/* Lead Sponsor */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Lead Sponsor
      </label>
      <input
        type="text"
        placeholder="Organization name"
        value={filters.sponsor ?? ""}
        onChange={(e) => setFilters({ ...filters, sponsor: e.target.value })}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
      />
    </div>

    {/* NCT Number */}
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
        NCT Number
      </label>
      <input
        type="text"
        placeholder="NCT########"
        value={filters.nctId ?? ""}
        onChange={(e) => setFilters({ ...filters, nctId: e.target.value })}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
      />
    </div>

  </div>

  {/* FDAAA checkbox */}
  <div className="mt-4">
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={filters.fdaaa801Violation || false}
        onChange={(e) =>
          setFilters({ ...filters, fdaaa801Violation: e.target.checked })
        }
        className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
      />
      <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
        FDAAA 801 Violations
      </span>
    </label>
  </div>

  {/* AI Semantic Search Section */}
  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-400 rounded-xl p-4 mt-4">
    <div className="flex items-start gap-3">
      <label className="flex items-start gap-2.5 cursor-pointer flex-1">
        <input 
          type="checkbox" 
          id="useSemanticSearch"
          checked={filters.useSemanticSearch || false}
          onChange={(e) => setFilters({...filters, useSemanticSearch: e.target.checked})}
          className="w-5 h-5 mt-0.5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        />
        <div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <strong className="text-indigo-700 text-sm">AI Semantic Search (RAG)</strong>
          </div>
          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
            Find trials by meaning, not just keywords. Example: "heart attack" will find "myocardial infarction" trials
          </p>
        </div>
      </label>
    </div>
    
    {/* Max Results Field - Only visible when semantic search is enabled */}
    {filters.useSemanticSearch && (
      <div className="mt-3 pt-3 border-t border-indigo-200">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Maximum Results
          </span>
          <input 
            type="number" 
            id="maxSemanticResults"
            min="1"
            max="30000"
            value={filters.maxSemanticResults ?? 1000}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value) && value > 0) {
                setFilters({...filters, maxSemanticResults: Math.min(value, 30000)});
              } else if (e.target.value === '') {
                setFilters({...filters, maxSemanticResults: undefined});
              }
            }}
            className="px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            placeholder="1000"
          />
          <span className="text-xs text-gray-600">
            Maximum number of semantic search results to retrieve (default: 1000, max: 30,000)
          </span>
        </label>
      </div>
    )}
  </div>

  {/* Action Buttons */}
  <div className="mt-5 flex gap-3 flex-col sm:flex-row">
    <button 
      onClick={handleSearch} 
      disabled={loading}
      className={`px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-all duration-200 shadow-sm ${
        loading 
          ? 'bg-gray-400 cursor-not-allowed opacity-60' 
          : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-95'
      }`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Searching...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </span>
      )}
    </button>
    
    <button 
      onClick={handleClear} 
      disabled={loading}
      className={`px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-all duration-200 shadow-sm ${
        loading 
          ? 'bg-gray-400 cursor-not-allowed opacity-60' 
          : 'bg-gray-600 hover:bg-gray-700 hover:shadow-md active:scale-95'
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Clear Filters
      </span>
    </button>
  </div>
</div>
    </div>
  );
}


