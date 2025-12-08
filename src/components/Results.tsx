'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { searchStudies, setPage, setPerPage } from '@/store/slices/searchSlice';
import { setCurrentStudy } from '@/store/slices/chatSlice';
import { updateSessionFromChat, setCurrentSession } from '@/store/slices/sessionsSlice';
import { useSearchMutation } from '@/hooks/useSearchQuery';

export default function Results() {
  const dispatch = useAppDispatch();
  const { results, total, page, perPage, totalPages, filters, loading, searchType } = useAppSelector((state) => state.search);
  const { currentSessionId } = useAppSelector((state) => state.sessions);
  const searchMutation = useSearchMutation();

  useEffect(() => {
    const perPageSelect = document.getElementById('perPage') as HTMLSelectElement;
    if (perPageSelect) {
      const handlePerPageChange = async () => {
        const newPerPage = parseInt(perPageSelect.value);
        dispatch(setPerPage(newPerPage));
        if (filters) {
          try {
            const result = await searchMutation({
              filters,
              page: 1,
              perPage: newPerPage,
              sessionId: currentSessionId || undefined,
              syncToRedux: true,
            });
            
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
            if (error !== 'Request aborted') {
              console.error('Search failed:', error);
            }
          }
        }
      };
      perPageSelect.addEventListener('change', handlePerPageChange);
      return () => {
        perPageSelect.removeEventListener('change', handlePerPageChange);
      };
    }
  }, [dispatch, filters]);

  const openChatModal = (nctId: string) => {
    dispatch(setCurrentStudy(nctId));
    const modal = document.getElementById('chatModal') as HTMLElement;
    if (modal) {
      modal.style.display = 'block';
    }
  };

  const handlePageChange = async (newPage: number) => {
    dispatch(setPage(newPage));
    if (filters) {
      try {
        const result = await searchMutation({
          filters,
          page: newPage,
          perPage,
          sessionId: currentSessionId || undefined,
          syncToRedux: true,
        });
        
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
        if (error !== 'Request aborted') {
          console.error('Search failed:', error);
        }
      }
    }
  };

  // Skeleton loader component
  const SkeletonCard = () => (
    <div className="border border-[#e0e0e0] p-5 mb-4 rounded-md animate-pulse">
      <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-sm">
        <div className="flex gap-1.5">
          <span className="font-semibold text-[#555]">Status:</span>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="flex gap-1.5">
          <span className="font-semibold text-[#555]">Type:</span>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="flex gap-1.5">
          <span className="font-semibold text-[#555]">Phase:</span>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="flex gap-1.5">
          <span className="font-semibold text-[#555]">Sponsor:</span>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="flex gap-1.5">
          <span className="font-semibold text-[#555]">Results:</span>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
      <div className="h-10 bg-gray-200 rounded w-40 mt-2.5"></div>
    </div>
  );

  return (
    <div className="bg-white p-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h2 className="mb-2 text-xl font-semibold text-[#333]">Results ({loading ? '...' : <span id="totalCount">{total.toLocaleString()}</span>} studies found)</h2>
          {searchType && (
            <div className="mt-2 text-sm">
              <span className={`px-3 py-1 rounded-xl text-white font-medium inline-block ${
                filters?.useSemanticSearch && filters.useSemanticSearch === true 
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2]' 
                  : 'bg-[#6c757d]'
              }`}>
                {filters?.useSemanticSearch && filters.useSemanticSearch === true ? '🤖 AI Semantic Search' : '🔍 Keyword Search'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>Results per page:</span>
          <select 
            id="perPage" 
            value={perPage} 
            disabled={loading}
            onChange={async (e) => {
              const newPerPage = Number(e.target.value);
              dispatch(setPerPage(newPerPage));
              if (filters) {
                try {
                  await searchMutation({
                    filters,
                    page: 1,
                    perPage: newPerPage,
                    sessionId: currentSessionId || undefined,
                    syncToRedux: true,
                  });
                } catch (error: any) {
                  if (error !== 'Request aborted') {
                    console.error('Search failed:', error);
                  }
                }
              }
            }}
            className="p-1.5 border border-[#ddd] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      <div id="resultsContainer">
        {loading ? (
          // Show skeleton loaders while loading
          <div>
            {Array.from({ length: Math.min(perPage, 10) }, (_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p>No studies found. Use the search form above to find clinical trials.</p>
        ) : (
          results.map((study) => {
            const ps = study.protocolSection;
            const id = ps.identificationModule;
            const status = ps.statusModule;
            const design = ps.designModule;
            const sponsor = ps.sponsorCollaboratorsModule;
            
            const statusClass = status.overallStatus === 'RECRUITING' ? 'recruiting' : 
                               status.overallStatus === 'COMPLETED' ? 'completed' : '';
            
            return (
              <div key={id.nctId} className="border border-[#e0e0e0] p-5 mb-4 rounded-md transition-shadow hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
                <h3 
                  onClick={() => window.open(`https://clinicaltrials.gov/study/${id.nctId}`, '_blank')}
                  className="text-[#0066cc] mb-3 cursor-pointer hover:underline text-lg font-semibold"
                >
                  {id.nctId}: {id.briefTitle || 'No title'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-sm">
                  <div className="flex gap-1.5">
                    <span className="font-semibold text-[#555]">Status:</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      statusClass === 'recruiting' ? 'bg-[#28a745] text-white' :
                      statusClass === 'completed' ? 'bg-[#6c757d] text-white' :
                      'text-[#333]'
                    }`}>{status.overallStatus}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="font-semibold text-[#555]">Type:</span>
                    <span className="text-[#333]">{design.studyType}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="font-semibold text-[#555]">Phase:</span>
                    <span className="text-[#333]">{design.phases?.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="font-semibold text-[#555]">Sponsor:</span>
                    <span className="text-[#333]">{sponsor?.leadSponsor?.name || 'N/A'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="font-semibold text-[#555]">Results:</span>
                    {study.hasResults ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-[#17a2b8] text-white">Has Results</span>
                    ) : (
                      <span className="text-[#333]">No Results</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    openChatModal(id.nctId);
                  }}
                  className="mt-2.5 px-4 py-2 bg-[#28a745] text-white border-none rounded cursor-pointer hover:bg-[#218838] transition-colors"
                >
                  💬 Ask About This Study
                </button>
              </div>
            );
          })
        )}
      </div>
          {totalPages > 1 && !loading && (
        <div id="pagination" className="flex justify-center gap-2.5 mt-5 flex-wrap">
          <button 
            disabled={page === 1 || loading} 
            onClick={() => handlePageChange(page - 1)}
            className="px-4 py-2 rounded border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#0066cc] text-white hover:bg-[#0052a3] disabled:hover:bg-[#0066cc]"
          >
            « Previous
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, page - 3) + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                className={`px-4 py-2 rounded border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  pageNum === page 
                    ? 'bg-[#28a745] text-white' 
                    : 'bg-[#0066cc] text-white hover:bg-[#0052a3]'
                }`}
                disabled={loading}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button 
            disabled={page === totalPages || loading} 
            onClick={() => handlePageChange(page + 1)}
            className="px-4 py-2 rounded border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#0066cc] text-white hover:bg-[#0052a3] disabled:hover:bg-[#0066cc]"
          >
            Next »
          </button>
        </div>
      )}
    </div>
  );
}
