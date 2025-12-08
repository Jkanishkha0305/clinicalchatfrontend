import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchApi } from '@/lib/api';
import { SearchFilters, SearchResults } from '@/lib/types';
import { useAppDispatch } from '@/store/hooks';
import { useEffect } from 'react';

interface SearchQueryParams {
  filters: SearchFilters;
  page?: number;
  perPage?: number;
  sessionId?: string;
  enabled?: boolean;
  // If true, will sync results to Redux state
  syncToRedux?: boolean;
}

interface SearchQueryResponse extends SearchResults {
  sessionInfo?: {
    sessionId: string;
    session: {
      id: string;
      title: string;
      description?: string;
    };
    last_filters: SearchFilters;
  };
}

// Helper function to create a stable cache key from filters
function createCacheKey(filters: SearchFilters, page: number, perPage: number, sessionId?: string): string {
  // Create a normalized version of filters for consistent caching
  const normalizedFilters = {
    condition: filters.condition || '',
    intervention: filters.intervention || '',
    location: filters.location || '',
    status: filters.status || [],
    studyType: filters.studyType || [],
    phase: filters.phase || [],
    sex: filters.sex || '',
    ageGroups: filters.ageGroups || [],
    healthyVolunteers: filters.healthyVolunteers || false,
    hasResults: filters.hasResults || '',
    hasProtocol: filters.hasProtocol || false,
    hasSAP: filters.hasSAP || false,
    hasICF: filters.hasICF || false,
    funderType: filters.funderType || [],
    studyStartFrom: filters.studyStartFrom || '',
    studyStartTo: filters.studyStartTo || '',
    primaryCompletionFrom: filters.primaryCompletionFrom || '',
    primaryCompletionTo: filters.primaryCompletionTo || '',
    title: filters.title || '',
    outcome: filters.outcome || '',
    sponsor: filters.sponsor || '',
    nctId: filters.nctId || '',
    fdaaa801Violation: filters.fdaaa801Violation || false,
    useSemanticSearch: filters.useSemanticSearch || false,
    maxSemanticResults: filters.maxSemanticResults,
    query: filters.query || '',
  };

  // Create a unique key based on sessionId, filters, page, and perPage
  const keyParts = [
    'search',
    sessionId || 'no-session',
    JSON.stringify(normalizedFilters),
    page.toString(),
    perPage.toString(),
  ];

  return keyParts.join('::');
}

export function useSearchQuery({
  filters,
  page = 1,
  perPage = 20,
  sessionId,
  enabled = true,
  syncToRedux = false,
}: SearchQueryParams) {
  const cacheKey = createCacheKey(filters, page, perPage, sessionId);
  const dispatch = useAppDispatch();

  const query = useQuery<SearchQueryResponse, Error>({
    queryKey: [cacheKey],
    queryFn: async () => {
      const searchFilters = { ...filters, page, per_page: perPage, sessionId };
      const response = await searchApi.search(searchFilters);
      return response;
    },
    enabled,
    // Cache data for 5 minutes (staleTime)
    staleTime: 5 * 60 * 1000,
    // Keep unused data in cache for 10 minutes (gcTime)
    gcTime: 10 * 60 * 1000,
  });

  // Sync to Redux when data is available and syncToRedux is true
  useEffect(() => {
    if (syncToRedux && query.data && query.isSuccess) {
      // Dispatch to Redux to update the state
      dispatch({
        type: 'search/searchStudies/fulfilled',
        payload: {
          ...query.data,
          filters: { ...filters, page, per_page: perPage, sessionId },
          expectedSessionId: sessionId || null,
        },
      });
    }
  }, [query.data, query.isSuccess, syncToRedux, dispatch, filters, page, perPage, sessionId]);

  return query;
}

// Helper function to manually trigger a search and cache it
export function useSearchMutation() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return async ({
    filters,
    page = 1,
    perPage = 20,
    sessionId,
    syncToRedux = true,
  }: {
    filters: SearchFilters;
    page?: number;
    perPage?: number;
    sessionId?: string;
    syncToRedux?: boolean;
  }) => {
    const cacheKey = createCacheKey(filters, page, perPage, sessionId);
    
    // Check if data is already in cache
    const cachedData = queryClient.getQueryData<SearchQueryResponse>([cacheKey]);
    
    if (cachedData) {
      // Data is cached, use it immediately
      if (syncToRedux) {
        dispatch({
          type: 'search/searchStudies/fulfilled',
          payload: {
            ...cachedData,
            filters: { ...filters, page, per_page: perPage, sessionId },
            expectedSessionId: sessionId || null,
          },
        });
      }
      return cachedData;
    }

    // Data not in cache, fetch it
    // Dispatch pending action to set loading state
    if (syncToRedux) {
      dispatch({
        type: 'search/searchStudies/pending',
        meta: {
          arg: { filters, page, perPage, sessionId },
        },
      });
    }

    try {
      const searchFilters = { ...filters, page, per_page: perPage, sessionId };
      const response = await searchApi.search(searchFilters);
      
      // Cache the response
      queryClient.setQueryData([cacheKey], response);
      
      // Sync to Redux if needed
      if (syncToRedux) {
        dispatch({
          type: 'search/searchStudies/fulfilled',
          payload: {
            ...response,
            filters: searchFilters,
            expectedSessionId: sessionId || null,
          },
        });
      }
      
      return response;
    } catch (error) {
      // Dispatch rejected action on error
      if (syncToRedux) {
        dispatch({
          type: 'search/searchStudies/rejected',
          payload: error instanceof Error ? error.message : 'Search failed',
        });
      }
      throw error;
    }
  };
}

