export interface User {
  id?: string;
  username: string;
  email?: string;
  is_guest: boolean;
  token?: string; // JWT token for authenticated users
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  metadata?: {
    type?: string;
    condition?: string;
    intervention?: string | null;
    [key: string]: any;
  };
}

export interface Study {
  nctId: string;
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
    };
    statusModule: {
      overallStatus: string;
    };
    designModule: {
      studyType: string;
      phases?: string[];
    };
    sponsorCollaboratorsModule: {
      leadSponsor?: {
        name: string;
      };
    };
  };
  hasResults: boolean;
}

export interface SearchFilters {
  condition?: string;
  intervention?: string;
  location?: string;
  status?: string[];
  studyType?: string[];
  phase?: string[];
  sex?: string;
  ageGroups?: string[];
  healthyVolunteers?: boolean;
  hasResults?: string;
  hasProtocol?: boolean;
  hasSAP?: boolean;
  hasICF?: boolean;
  funderType?: string[];
  studyStartFrom?: string;
  studyStartTo?: string;
  primaryCompletionFrom?: string;
  primaryCompletionTo?: string;
  title?: string;
  outcome?: string;
  sponsor?: string;
  nctId?: string;
  fdaaa801Violation?: boolean;
  page?: number;
  per_page?: number;
  useSemanticSearch?: boolean;
  maxSemanticResults?: number;
  query?: string; // Natural language query for semantic search
}

export interface SearchResults {
  results: Study[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  searchType?: 'keyword' | 'semantic';
}

export interface ProtocolReport {
  condition: string;
  intervention: string | null;
  report: string;
  created_at?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  description?: string;
  last_filters?: SearchFilters;
  last_report_filters?: {
    condition: string;
    intervention: string | null;
  };
  custom_questions?: string[] | null;
  messages?: ChatMessage[];
  reports?: ProtocolReport[];
  updated_at?: string;
  created_at?: string;
}

