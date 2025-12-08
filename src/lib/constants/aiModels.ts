export type AIModel = 
  | 'gpt-5.1' | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1-mini' | 'gpt-4.1-nano' | 'gpt-4o-mini'
  | 'gemini-3-pro-preview' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';

export const AI_MODELS: { label: string; value: AIModel; group: 'GPT' | 'Gemini' }[] = [
  // GPT Models
  { label: 'GPT-5.1', value: 'gpt-5.1', group: 'GPT' },
  { label: 'GPT-5', value: 'gpt-5', group: 'GPT' },
  { label: 'GPT-5 Mini', value: 'gpt-5-mini', group: 'GPT' },
  { label: 'GPT-5 Nano', value: 'gpt-5-nano', group: 'GPT' },
  { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini', group: 'GPT' },
  { label: 'GPT-4.1 Nano', value: 'gpt-4.1-nano', group: 'GPT' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini', group: 'GPT' },
  
  // Gemini Models
  { label: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview', group: 'Gemini' },
  { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro', group: 'Gemini' },
  { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash', group: 'Gemini' },
  { label: 'Gemini 2.5 Flash Lite', value: 'gemini-2.5-flash-lite', group: 'Gemini' },
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash', group: 'Gemini' },
  { label: 'Gemini 2.0 Flash Lite', value: 'gemini-2.0-flash-lite', group: 'Gemini' },
];

export const getModelGroup = (model: AIModel): 'GPT' | 'Gemini' => {
  if (model.startsWith('gpt-')) return 'GPT';
  if (model.startsWith('gemini-')) return 'Gemini';
  return 'GPT'; // default
};

/**
 * Get provider name from model name
 * @param model - Model name (e.g., 'gpt-5.1', 'gemini-3-pro-preview')
 * @returns Provider name: 'openai', 'gemini', or 'grok'
 */
export const getProviderFromModel = (model: string): 'openai' | 'gemini' | 'grok' => {
  if (!model) return 'openai';
  
  const normalizedModel = model.toLowerCase();
  
  // GPT models (OpenAI)
  if (normalizedModel.startsWith('gpt-')) {
    return 'openai';
  }
  
  // Gemini models
  if (normalizedModel.startsWith('gemini-')) {
    return 'gemini';
  }
  
  // Grok models (xAI)
  if (normalizedModel.startsWith('grok-')) {
    return 'grok';
  }
  
  // Default fallback
  return 'openai';
};

