import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BACKEND_SERVER_URL, PROJECT_MODE, TOKEN_STORAGE_KEY } from './constants/api.constant';
import { useCrypto } from './utils/crypto';
import deepParseJson from './utils/deepParseJson';
import { SearchFilters, SearchResults, Study, ChatMessage, ChatSession, User } from './types';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BACKEND_SERVER_URL,
    headers: {
      'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async function (config) {
    const { encodeData } = useCrypto();

    // Encrypt data in production mode
    if (PROJECT_MODE === 'production' && config.data) {
      const encryptedBody = await encodeData(config.data);

      if (!encryptedBody.success) {
        console.error('Failed To Encrypt Config Body...');
        return Promise.reject(new Error('Failed To Encrypt Config Body...'));
      }

      config.data = { data: encryptedBody.data };
    }

    // Add JWT token to headers if available
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
          }
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  async function (response: AxiosResponse) {
    const { decodeData } = useCrypto();

    // Decrypt data in production mode
    if (PROJECT_MODE === 'production') {
      // Server middleware encrypts response and returns encrypted string directly
      // Check if response.data is a string (encrypted) or already an object (decrypted/development)
      if (typeof response.data === 'string') {
        const decodedResponse = await decodeData(response.data);

        if (!decodedResponse.success) {
          console.error('Failed To Decode Response Data...');
          return Promise.reject(new Error('Failed To Decode Response Data...'));
}

        // Replace encrypted string with decrypted object
        response.data = decodedResponse.data;
        return response.data;
      }
      // If already an object, it might be in development mode or already decrypted
      // Just return it as is
    }

    // Handle auth errors
    const result = response.data;
    if (result && typeof result === 'object' && 'isAuth' in result) {
      const isAuth = typeof result.isAuth === 'string' ? result.isAuth === 'true' : result.isAuth;

      if (!isAuth) {
        if (typeof window !== 'undefined') {
          // Check if user is a guest before redirecting
          // Guest users should not be redirected to login
          let isGuestUser = false;
          try {
            const appUserStr = localStorage.getItem('appUser');
            if (appUserStr) {
              const appUser = JSON.parse(appUserStr);
              isGuestUser = appUser && appUser.is_guest === true;
            }
          } catch (e) {
            // Ignore parse errors
          }

          // Only redirect non-guest users
          if (!isGuestUser) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            // Redirect to login or reload
            if (window.location.pathname !== '/auth/login') {
              window.location.href = '/auth/login';
            }
          }
        }
      }
    }

    // Return the response data (which may have been decrypted in production mode)
    return response.data || result;
  },
  function (error) {
    // Handle auth errors in error response
    if (error?.response?.data?.isAuth === false) {
      if (typeof window !== 'undefined') {
        // Check if user is a guest before redirecting
        // Guest users should not be redirected to login
        let isGuestUser = false;
        try {
          const appUserStr = localStorage.getItem('appUser');
          if (appUserStr) {
            const appUser = JSON.parse(appUserStr);
            isGuestUser = appUser && appUser.is_guest === true;
          }
        } catch (e) {
          // Ignore parse errors
        }

        // Only redirect non-guest users
        if (!isGuestUser) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
        }
      }
    }

    // Create ApiError from axios error
    if (error.response) {
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        `HTTP ${error.response.status}`;
      throw new ApiError(error.response.status, message);
      }

    throw new ApiError(500, error.message || 'Network error');
}
);

// Auth API
export const authApi = {
  async login(username: string, password: string): Promise<{ success: boolean; data: User; token: string }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.post<{ success: boolean; data: User; token: string }>('/api/auth/login', {
      username,
      password,
    }) as any;
  },

  async signup(username: string, password: string, confirmPassword: string): Promise<{ success: boolean; data: User; token: string }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.post<{ success: boolean; data: User; token: string }>('/api/auth/sign-up', {
      username,
      password,
      confirmPassword,
    }) as any;
  },

  async logout(): Promise<void> {
    // Server doesn't have logout endpoint - just clear local storage
    // This is handled client-side only
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },

  async guest(): Promise<{ success: boolean; data: User }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.post<{ success: boolean; data: User }>('/api/auth/guest') as any;
  },
};

// Search API
export const searchApi = {
  async search(filters: SearchFilters & { sessionId?: string }, signal?: AbortSignal): Promise<SearchResults & { sessionInfo?: { sessionId: string; session: ChatSession; last_filters: SearchFilters } }> {
    // Response interceptor returns data directly, not AxiosResponse
    const response = await api.post<any>('/api/search', filters, { signal }) as any;
    // Server returns: { success, message, total, page, per_page, total_pages, results, sessionInfo?: { id, title, description } }
    const { success, message, sessionInfo, ...searchResults } = response;
    
    // Server returns sessionInfo object with { id, title, description } structure
    if (sessionInfo) {
      return {
        ...searchResults,
        sessionInfo: {
          sessionId: sessionInfo.id || sessionInfo.sessionId,
          session: {
            id: sessionInfo.id || sessionInfo.sessionId,
            title: sessionInfo.title,
            description: sessionInfo.description,
          },
          last_filters: sessionInfo.last_filters,
        },
      };
    }
    
    return searchResults as SearchResults;
  },

  async getStudy(nctId: string): Promise<{ success: boolean; data: Study }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.get<{ success: boolean; data: Study }>(`/api/study/${nctId}`) as any;
  },

  async getStatistics(filters?: SearchFilters): Promise<{
    success: boolean;
    total: number;
    status_distribution: Array<{ _id: string; count: number }>;
    phase_distribution: Array<{ _id: string; count: number }>;
  }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.post<{
      success: boolean;
      total: number;
      status_distribution: Array<{ _id: string; count: number }>;
      phase_distribution: Array<{ _id: string; count: number }>;
    }>('/api/statistics', filters || {}) as any;
  },

  async generateProtocolReport(condition: string, intervention?: string, sessionId?: string, format: 'standard' | 'styled' | 'professional' = 'styled', abortController?: AbortController): Promise<{
    success: boolean;
    report: string;
    metadata: {
      trials_analyzed: number;
      total_matching: number;
      condition: string;
      intervention: string | null;
    };
    sessionInfo?: {
      id: string;
      title: string;
      description: string;
    };
  }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.post<{
      success: boolean;
      report: string;
      metadata: {
        trials_analyzed: number;
        total_matching: number;
        condition: string;
        intervention: string | null;
      };
      sessionInfo?: {
        id: string;
        title: string;
        description: string;
      };
    }>('/api/generate-protocol-report', {
      condition,
      intervention: intervention || '',
      sessionId: sessionId || '',
      format: format || 'styled',
    }, {
      signal: abortController?.signal,
    }) as any;
  },

  async generateChatReport(sessionId: string, format: 'standard' | 'styled' | 'professional' = 'styled', abortController?: AbortController): Promise<{
    success: boolean;
    report: string;
    metadata: {
      messages_count: number;
      studies_analyzed: number;
      total_matching: number;
      condition: string;
      intervention: string | null;
    };
    sessionInfo?: {
      id: string;
      title: string;
      description: string;
    };
  }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.post<{
      success: boolean;
      report: string;
      metadata: {
        messages_count: number;
        studies_analyzed: number;
        total_matching: number;
        condition: string;
        intervention: string | null;
      };
      sessionInfo?: {
        id: string;
        title: string;
        description: string;
      };
    }>('/api/generate-chat-report', {
      sessionId,
      format: format || 'styled',
    }, {
      signal: abortController?.signal,
    }) as any;
  },

  async generateStudyChatReport(studyId: string, chatSessionId?: string, format: 'standard' | 'styled' | 'professional' = 'styled', abortController?: AbortController): Promise<{
    success: boolean;
    report: string;
    metadata: {
      messages_count: number;
      study_id: string;
      study_title: string;
      report_type: string;
    };
  }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.post<{
      success: boolean;
      report: string;
      metadata: {
        messages_count: number;
        study_id: string;
        study_title: string;
        report_type: string;
      };
    }>('/api/generate-study-chat-report', {
      studyId,
      chatSessionId: chatSessionId || '',
      format: format || 'styled',
    }, {
      signal: abortController?.signal,
    }) as any;
  },
};

// Chat API
export const chatApi = {
  async chatSingleStudy(nctId: string, question: string, chatSessionId?: string, model?: string): Promise<{ success: boolean; answer: string }> {
    // Response interceptor returns data directly, not AxiosResponse
    // Extract provider from model name for validation, but also send model for backend processing
    const { getProviderFromModel } = require('./constants/aiModels');
    const provider = model ? getProviderFromModel(model) : undefined;
    
    const body: any = {
      nctId,
      question,
    };
    if (chatSessionId) {
      body.chatSessionId = chatSessionId;
    }
    if (provider) {
      body.provider = provider; // Send provider for validation (openai, gemini, grok)
    }
    if (model) {
      body.model = model; // Also send model name for backend to use specific model
    }
    
    return await api.post<{ success: boolean; answer: string }>('/api/chat', body) as any;
  },

  async chatSingleStudyStream(
    nctId: string,
    question: string,
    chatSessionId: string | undefined,
    onChunk: (chunk: string) => void,
    onComplete: (answer: string) => void,
    onError: (error: string) => void,
    model?: string,
    abortController?: AbortController
  ): Promise<void> {
    try {
      const url = `${BACKEND_SERVER_URL}/api/chat-stream`;
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      const user = token ? JSON.parse(token) : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (user && user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      // Encrypt in production
      // Extract provider from model name for validation, but also send model for backend processing
      const { getProviderFromModel } = require('./constants/aiModels');
      const provider = model ? getProviderFromModel(model) : undefined;
      
      let body: any = { nctId, question };
      if (chatSessionId) {
        body.chatSessionId = chatSessionId;
      }
      if (provider) {
        body.provider = provider; // Send provider for validation (openai, gemini, grok)
      }
      if (model) {
        body.model = model; // Also send model name for backend to use specific model
      }
      if (PROJECT_MODE === 'production') {
        const { encodeData } = useCrypto();
        const encryptedBody = await encodeData(body);
        if (!encryptedBody.success) {
          throw new Error('Failed to encrypt request data');
        }
        body = { data: encryptedBody.data };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        // Check if aborted
        if (abortController?.signal.aborted) {
          reader.cancel();
          // Don't call onError for user-initiated cancellations - just return silently
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content' && data.chunk) {
                onChunk(data.chunk);
              } else if (data.type === 'done' && data.answer) {
                onComplete(data.answer);
              } else if (data.type === 'error') {
                onError(data.error || 'Unknown error occurred');
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'done' && data.answer) {
                onComplete(data.answer);
              } else if (data.type === 'error') {
                onError(data.error || 'Unknown error occurred');
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      // Check if error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't call onError for user-initiated cancellations - just return silently
        return;
      }
      onError(error instanceof Error ? error.message : 'Streaming failed');
    }
  },

  async chatAllStudies(
    filters: SearchFilters,
    question: string,
    advancedMode: boolean,
    sessionId?: string,
    model?: string
  ): Promise<{
    success: boolean;
    answer: string;
    info?: string;
    sessionInfo?: {
      sessionId: string;
      title: string;
      description: string;
    };
  }> {
    // Response interceptor returns data directly, not AxiosResponse
    // Extract provider from model name for validation, but also send model for backend processing
    const { getProviderFromModel } = require('./constants/aiModels');
    const provider = model ? getProviderFromModel(model) : undefined;
    
    const body: any = {
      filters,
      question,
      advancedMode,
    };
    if (sessionId) {
      body.sessionId = sessionId;
    }
    if (provider) {
      body.provider = provider; // Send provider for validation (openai, gemini, grok)
    }
    if (model) {
      body.model = model; // Also send model name for backend to use specific model
    }
    
    const response = await api.post<any>('/api/chat-all', body) as any;
    // Server returns: { success, message, answer, info?, sessionInfo?: { sessionId, title, description } }
    // Note: sessionInfo from server has { sessionId, title, description } structure
    const { success, message, sessionInfo, ...rest } = response;
    return {
      ...rest,
      sessionInfo: sessionInfo ? {
        sessionId: sessionInfo.sessionId || sessionInfo.id,
        title: sessionInfo.title,
        description: sessionInfo.description,
      } : undefined,
    };
  },

  async chatAllStudiesStream(
    filters: SearchFilters,
    question: string,
    advancedMode: boolean,
    sessionId: string | undefined,
    onChunk: (chunk: string) => void,
    onComplete: (answer: string, info?: string, sessionInfo?: { sessionId: string; title: string; description: string }) => void,
    onError: (error: string) => void,
    model?: string,
    abortController?: AbortController
  ): Promise<void> {
    try {
      const url = `${BACKEND_SERVER_URL}/api/chat-all-stream`;
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      const user = token ? JSON.parse(token) : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (user && user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      // Encrypt in production
      // Extract provider from model name for validation, but also send model for backend processing
      const { getProviderFromModel } = require('./constants/aiModels');
      const provider = model ? getProviderFromModel(model) : undefined;
      
      let body: any = { filters, question, advancedMode, sessionId };
      if (provider) {
        body.provider = provider; // Send provider for validation (openai, gemini, grok)
      }
      if (model) {
        body.model = model; // Also send model name for backend to use specific model
      }
      if (PROJECT_MODE === 'production') {
        const { encodeData } = useCrypto();
        const encryptedBody = await encodeData(body);
        if (!encryptedBody.success) {
          throw new Error('Failed to encrypt request data');
        }
        body = { data: encryptedBody.data };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        // Check if aborted
        if (abortController?.signal.aborted) {
          reader.cancel();
          // Don't call onError for user-initiated cancellations - just return silently
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content' && data.chunk) {
                onChunk(data.chunk);
              } else if (data.type === 'done' && data.answer) {
                const sessionInfo = data.sessionInfo ? {
                  sessionId: data.sessionInfo.sessionId || data.sessionInfo.id,
                  title: data.sessionInfo.title,
                  description: data.sessionInfo.description,
                } : undefined;
                onComplete(data.answer, data.info, sessionInfo);
              } else if (data.type === 'error') {
                const sessionInfo = data.sessionInfo ? {
                  sessionId: data.sessionInfo.sessionId || data.sessionInfo.id,
                  title: data.sessionInfo.title,
                  description: data.sessionInfo.description,
                } : undefined;
                if (sessionInfo) {
                  onComplete('', data.info, sessionInfo);
                }
                onError(data.error || 'Unknown error occurred');
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'done' && data.answer) {
                const sessionInfo = data.sessionInfo ? {
                  sessionId: data.sessionInfo.sessionId || data.sessionInfo.id,
                  title: data.sessionInfo.title,
                  description: data.sessionInfo.description,
                } : undefined;
                onComplete(data.answer, data.info, sessionInfo);
              } else if (data.type === 'error') {
                onError(data.error || 'Unknown error occurred');
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      // Check if error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't call onError for user-initiated cancellations - just return silently
        return;
      }
      onError(error instanceof Error ? error.message : 'Streaming failed');
    }
  },
};

// User Preferences API
export const userPreferencesApi = {
  async get(): Promise<{ success: boolean; preferences: { default_chat_questions: string[]; ai_provider: 'openai' | 'gemini' | 'grok'; ai_model: string } }> {
    return await api.get<{ success: boolean; preferences: { default_chat_questions: string[]; ai_provider: 'openai' | 'gemini' | 'grok'; ai_model: string } }>('/api/user-preferences') as any;
  },

  async update(updates: { default_chat_questions?: string[]; ai_provider?: 'openai' | 'gemini' | 'grok'; ai_model?: string }): Promise<{ success: boolean; preferences: { default_chat_questions: string[]; ai_provider: 'openai' | 'gemini' | 'grok'; ai_model: string } }> {
    return await api.patch<{ success: boolean; preferences: { default_chat_questions: string[]; ai_provider: 'openai' | 'gemini' | 'grok'; ai_model: string } }>('/api/user-preferences', updates) as any;
  },
};

// User Settings API
export const userSettingsApi = {
  async get(): Promise<{ success: boolean; settings: { theme: string; visible_models: string[]; report_format: string } }> {
    return await api.get<{ success: boolean; settings: { theme: string; visible_models: string[]; report_format: string } }>('/api/user-settings') as any;
  },

  async update(updates: { theme?: string; visible_models?: string[]; report_format?: string }): Promise<{ success: boolean; settings: { theme: string; visible_models: string[]; report_format: string } }> {
    return await api.patch<{ success: boolean; settings: { theme: string; visible_models: string[]; report_format: string } }>('/api/user-settings', updates) as any;
  },
};

// Chat Questions API
export const chatQuestionsApi = {
  async get(sessionId?: string): Promise<{ success: boolean; questions: string[]; source?: string }> {
    const params = sessionId ? { sessionId } : {};
    return await api.get<{ success: boolean; questions: string[]; source?: string }>('/api/chat-questions', { params }) as any;
  },

  async update(sessionId: string, questions: string[], saveAsDefault: boolean = false): Promise<{ success: boolean; message: string; session?: any; preferences?: any }> {
    return await api.patch<{ success: boolean; message: string; session?: any; preferences?: any }>('/api/chat-questions', {
      sessionId,
      questions,
      saveAsDefault,
    }) as any;
  },
};

// Chat Sessions API
export const chatSessionsApi = {
  async list(): Promise<{ success: boolean; sessions: ChatSession[] }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.get<{ success: boolean; sessions: ChatSession[] }>('/api/chat-sessions') as any;
  },

  async create(data?: { title?: string; description?: string; last_filters?: SearchFilters }): Promise<{ success: boolean; session: ChatSession }> {
    // Response interceptor returns data directly, not AxiosResponse
    return await api.post<{ success: boolean; session: ChatSession }>('/api/chat-sessions', data || {}) as any;
  },

  async get(id: string): Promise<{ success: boolean; session: ChatSession }> {
    // Don't cache filter data - always fetch fresh
    // Response interceptor returns data directly, not AxiosResponse
    const response = await api.get<{ success: boolean; session: ChatSession }>(`/api/chat-sessions/${id}`) as any;
    
    return response;
  },

  async update(
    id: string,
    data: { title?: string; description?: string; last_filters?: SearchFilters; custom_questions?: string[] | null }
  ): Promise<{ success: boolean; session: ChatSession }> {
    // Response interceptor returns data directly, not AxiosResponse
    const response = await api.patch<{ success: boolean; session: ChatSession }>(`/api/chat-sessions/${id}`, data) as any;
    
    // Don't cache filter data
    return response;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    // Response interceptor returns data directly, not AxiosResponse
    const response = await api.delete<{ success: boolean; message: string }>(`/api/chat-sessions/${id}`) as any;
    
    // Don't cache filter data - no need to remove from cache
    return response;
  },

  async updateQuestions(sessionId: string, questions: string[]): Promise<{ success: boolean; session: ChatSession }> {
    return await api.patch<{ success: boolean; session: ChatSession }>(`/api/chat-sessions/${sessionId}/questions`, {
      questions,
    }) as any;
  },
};

// Study Chat Questions API
export const studyChatQuestionsApi = {
  async get(studyId?: string, chatSessionId?: string): Promise<{ success: boolean; questions: string[]; source?: string }> {
    const params: any = {};
    if (studyId) params.studyId = studyId;
    if (chatSessionId) params.chatSessionId = chatSessionId;
    return await api.get<{ success: boolean; questions: string[]; source?: string }>('/api/study-chat-questions', { params }) as any;
  },

  async update(studyId: string | undefined, chatSessionId: string | undefined, questions: string[], saveAsDefault: boolean = false): Promise<{ success: boolean; message: string; preferences?: any; studyChat?: any }> {
    const body: any = {
      questions,
      saveAsDefault,
    };
    if (studyId) body.studyId = studyId;
    if (chatSessionId) body.chatSessionId = chatSessionId;
    return await api.patch<{ success: boolean; message: string; preferences?: any; studyChat?: any }>('/api/study-chat-questions', body) as any;
  },
};

// Study Chats API
export const studyChatsApi = {
  async get(studyId: string, chatSessionId?: string): Promise<{ success: boolean; studyChat: { study_id: string; chat_session_id: string | null; messages: Array<{ role: string; content: string; created_at: string }> } }> {
    const params = chatSessionId ? { chatSessionId } : {};
    return await api.get<{ success: boolean; studyChat: any }>(`/api/study-chats/${studyId}`, { params }) as any;
  },

  async list(chatSessionId?: string): Promise<{ success: boolean; studyChats: any[] }> {
    const params = chatSessionId ? { chatSessionId } : {};
    return await api.get<{ success: boolean; studyChats: any[] }>('/api/study-chats', { params }) as any;
  },

  async delete(studyId: string, chatSessionId: string): Promise<{ success: boolean; message: string }> {
    return await api.delete<{ success: boolean; message: string }>(`/api/study-chats/${studyId}/${chatSessionId}`) as any;
  },
};

export default api;
