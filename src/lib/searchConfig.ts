import { SearchFilters } from '@/lib/types';

export type SearchPrompt = {
  label: string;
  description: string;
  query: string;
  filters?: Partial<SearchFilters>;
};

export type Option = {
  value: string;
  label: string;
};

export const emptyFilters: SearchFilters = {
  condition: '',
  intervention: '',
  location: '',
  status: [],
  studyType: [],
  phase: [],
  sex: '',
  ageGroups: [],
  healthyVolunteers: false,
  hasResults: '',
  hasProtocol: false,
  hasSAP: false,
  hasICF: false,
  funderType: [],
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
  query: '',
};

export const searchPrompts: SearchPrompt[] = [
  {
    label: 'Recruiting oncology',
    description: 'Open trials that are currently enrolling.',
    query: 'Find recruiting oncology trials that are actively enrolling patients.',
    filters: {
      condition: 'Cancer',
      status: ['RECRUITING'],
      studyType: ['INTERVENTIONAL'],
    },
  },
  {
    label: 'GLP-1 obesity',
    description: 'Late-stage metabolic studies with modern interventions.',
    query: 'Show Phase 3 obesity trials evaluating GLP-1 or related metabolic treatments.',
    filters: {
      condition: 'Obesity',
      intervention: 'GLP-1',
      phase: ['PHASE3'],
    },
  },
  {
    label: 'Cardio with results',
    description: 'Studies where evidence is already published.',
    query: 'Search cardiovascular trials that already report results or topline evidence.',
    filters: {
      condition: 'Cardiovascular disease',
      hasResults: 'true',
    },
  },
  {
    label: 'Rare disease landscape',
    description: 'A broader exploration prompt for market scanning.',
    query: 'Map the current rare disease clinical trial landscape and highlight active sponsors.',
    filters: {
      studyType: ['INTERVENTIONAL', 'OBSERVATIONAL'],
    },
  },
];

export const statusOptions: Option[] = [
  { value: 'RECRUITING', label: 'Recruiting' },
  { value: 'NOT_YET_RECRUITING', label: 'Not yet recruiting' },
  { value: 'ACTIVE_NOT_RECRUITING', label: 'Active, not recruiting' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ENROLLING_BY_INVITATION', label: 'Invitation only' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

export const phaseOptions: Option[] = [
  { value: 'EARLY_PHASE1', label: 'Early Phase 1' },
  { value: 'PHASE1', label: 'Phase 1' },
  { value: 'PHASE2', label: 'Phase 2' },
  { value: 'PHASE3', label: 'Phase 3' },
  { value: 'PHASE4', label: 'Phase 4' },
  { value: 'NA', label: 'Not applicable' },
];

export const studyTypeOptions: Option[] = [
  { value: 'INTERVENTIONAL', label: 'Interventional' },
  { value: 'OBSERVATIONAL', label: 'Observational' },
  { value: 'EXPANDED_ACCESS', label: 'Expanded access' },
];

export const sexOptions: Option[] = [
  { value: '', label: 'All participants' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
];

export const ageGroupOptions: Option[] = [
  { value: 'CHILD', label: 'Child' },
  { value: 'ADULT', label: 'Adult' },
  { value: 'OLDER_ADULT', label: 'Older adult' },
];

export const funderTypeOptions: Option[] = [
  { value: 'NIH', label: 'NIH' },
  { value: 'FED', label: 'Federal' },
  { value: 'INDUSTRY', label: 'Industry' },
  { value: 'OTHER', label: 'Other' },
];

export const activeFilterCount = (filters?: SearchFilters | null): number => {
  if (!filters) {
    return 0;
  }

  let count = 0;

  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'page' || key === 'per_page' || key === 'maxSemanticResults') {
      return;
    }

    if (Array.isArray(value)) {
      count += value.length;
      return;
    }

    if (typeof value === 'boolean') {
      if (value) {
        count += 1;
      }
      return;
    }

    if (typeof value === 'string' && value.trim()) {
      count += 1;
    }
  });

  return count;
};
