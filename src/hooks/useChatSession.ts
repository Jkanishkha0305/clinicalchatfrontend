import { useQuery } from '@tanstack/react-query';
import { chatSessionsApi } from '@/lib/api';
import { ChatSession } from '@/lib/types';

interface UseChatSessionParams {
  sessionId: string | null | undefined;
  enabled?: boolean;
}

export function useChatSession({ sessionId, enabled = true }: UseChatSessionParams) {
  const queryKey = sessionId ? ['chat-session', sessionId] : ['chat-session', null];

  const query = useQuery<{ success: boolean; session: ChatSession }, Error>({
    queryKey,
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      return await chatSessionsApi.get(sessionId);
    },
    enabled: enabled && !!sessionId,
    // Don't cache filter data - always fetch fresh
    staleTime: 0,
    gcTime: 0,
  });

  return query;
}

// Helper function to manually fetch a session (no caching)
export function useChatSessionMutation() {
  return async (sessionId: string) => {
    // Always fetch fresh data - don't cache filter data
    try {
      const response = await chatSessionsApi.get(sessionId);
      return response;
    } catch (error) {
      throw error;
    }
  };
}


