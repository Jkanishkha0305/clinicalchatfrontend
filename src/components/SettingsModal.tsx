'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchPreferences, updatePreferences, fetchSettings, updateSettings, AIModel } from '@/store/slices/preferencesSlice';
import { AI_MODELS } from '@/lib/constants/aiModels';

interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function SettingsModal({ isOpen: externalIsOpen, onClose: externalOnClose }: SettingsModalProps = {}) {
  const { user } = useAppSelector((state) => state.auth);
  const { ai_model, visible_models } = useAppSelector((state) => state.preferences);
  const dispatch = useAppDispatch();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('ai-preferences');
  const [selectedModel, setSelectedModel] = useState<AIModel>(ai_model || 'gpt-4o-mini');
  const [selectedVisibleModels, setSelectedVisibleModels] = useState<string[]>(visible_models || []);
  const [savingModel, setSavingModel] = useState(false);
  const [savingVisibleModels, setSavingVisibleModels] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  const handleClose = useCallback(() => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  }, [externalOnClose]);

  // Load preferences and settings when modal opens
  useEffect(() => {
    if (isOpen && user && !user.is_guest) {
      dispatch(fetchPreferences());
      dispatch(fetchSettings());
    }
  }, [isOpen, user, dispatch]);

  // Update selected model when preferences change
  useEffect(() => {
    if (ai_model) {
      setSelectedModel(ai_model);
    }
  }, [ai_model]);

  // Update selected visible models when settings change
  useEffect(() => {
    if (visible_models && visible_models.length > 0) {
      setSelectedVisibleModels(visible_models);
    }
  }, [visible_models]);

  // Listen for custom event to open settings modal
  useEffect(() => {
    const handleOpenSettings = () => {
      if (externalIsOpen === undefined) {
        setInternalIsOpen(true);
      } else if (externalOnClose) {
        // If externally controlled, trigger the open via a callback
        // For now, we'll use internal state as fallback
        setInternalIsOpen(true);
      }
    };

    window.addEventListener('openSettingsModal', handleOpenSettings);
    return () => {
      window.removeEventListener('openSettingsModal', handleOpenSettings);
    };
  }, [externalIsOpen, externalOnClose]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  const handleModelChange = async (model: AIModel) => {
    if (!user || user.is_guest) return;
    
    setSelectedModel(model);
    setSavingModel(true);
    
    try {
      // If the selected model is not in visible_models, add it automatically
      if (!selectedVisibleModels.includes(model)) {
        const updatedVisibleModels = [...selectedVisibleModels, model];
        setSelectedVisibleModels(updatedVisibleModels);
        // Update visible_models in the background (don't wait for it)
        dispatch(updateSettings({ visible_models: updatedVisibleModels })).catch(err => {
          console.error('Failed to update visible models:', err);
        });
      }
      
      await dispatch(updatePreferences({ ai_model: model })).unwrap();
    } catch (error) {
      console.error('Failed to update AI model:', error);
      // Revert on error
      setSelectedModel(ai_model || 'gpt-4o-mini');
    } finally {
      setSavingModel(false);
    }
  };

  const handleVisibleModelToggle = async (modelValue: string) => {
    if (!user || user.is_guest) return;
    
    const newVisibleModels = selectedVisibleModels.includes(modelValue)
      ? selectedVisibleModels.filter(m => m !== modelValue)
      : [...selectedVisibleModels, modelValue];
    
    setSelectedVisibleModels(newVisibleModels);
    setSavingVisibleModels(true);
    
    try {
      await dispatch(updateSettings({ visible_models: newVisibleModels })).unwrap();
    } catch (error) {
      console.error('Failed to update visible models:', error);
      // Revert on error
      setSelectedVisibleModels(visible_models || []);
    } finally {
      setSavingVisibleModels(false);
    }
  };

  const handleSelectAllModels = async (group: 'GPT' | 'Gemini') => {
    if (!user || user.is_guest) return;
    
    const groupModels: string[] = AI_MODELS.filter(m => m.group === group).map(m => m.value);
    const newVisibleModels = groupModels.every(m => selectedVisibleModels.includes(m))
      ? selectedVisibleModels.filter((m: string) => !groupModels.includes(m)) // Deselect all
      : [...new Set([...selectedVisibleModels, ...groupModels])]; // Select all
    
    setSelectedVisibleModels(newVisibleModels);
    setSavingVisibleModels(true);
    
    try {
      await dispatch(updateSettings({ visible_models: newVisibleModels })).unwrap();
    } catch (error) {
      console.error('Failed to update visible models:', error);
      setSelectedVisibleModels(visible_models || []);
    } finally {
      setSavingVisibleModels(false);
    }
  };

  return (
    <div id="settingsModal" className={`fixed inset-0 bg-[rgba(21,101,192,0.4)] backdrop-blur-sm z-[2000] flex items-center justify-center p-5 transition-opacity ${
      isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
    }`} onClick={handleClose}>
      <div className="bg-white rounded-2xl w-full max-w-[800px] max-h-[85vh] flex flex-col lg:flex-row shadow-[0_24px_48px_rgba(21,101,192,0.2)] overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
        {/* Close button for mobile */}
        <button 
          className="absolute top-4 left-4 bg-transparent border-none text-[#546e7a] text-2xl cursor-pointer p-1 z-10 transition-colors hover:text-[#1565c0] lg:hidden" 
          onClick={handleClose}
          aria-label="Close settings"
        >
          ×
        </button>
        {/* Close button for desktop */}
        <button 
          className="absolute top-4 right-4 bg-transparent border-none text-[#546e7a] text-xl cursor-pointer p-2 z-10 transition-colors hover:text-[#1565c0] hover:bg-[rgba(21,101,192,0.05)] rounded-md hidden lg:flex items-center justify-center" 
          onClick={handleClose}
          aria-label="Close settings"
          title="Close (ESC)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="w-full lg:w-[240px] border-r border-[rgba(21,101,192,0.1)] bg-[rgba(21,101,192,0.02)] py-5 flex flex-col lg:flex-col flex-row overflow-x-auto lg:overflow-x-visible">
          {/* <div 
            className={`flex items-center gap-3 px-6 py-3 text-[#546e7a] cursor-pointer transition-all border-l-[3px] border-l-transparent text-sm lg:border-l-3 lg:border-l-transparent ${
              activeSection === 'general' 
                ? 'bg-[rgba(21,101,192,0.12)] text-[#1565c0] border-l-[#1565c0] font-semibold lg:border-l-[#1565c0]' 
                : 'hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]'
            } whitespace-nowrap lg:whitespace-normal`}
            onClick={() => setActiveSection('general')}
            data-section="general"
          >
            <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
            </svg>
            <span>General</span>
          </div> */}
          <div 
            className={`flex items-center gap-3 px-6 py-3 text-[#546e7a] cursor-pointer transition-all border-l-[3px] border-l-transparent text-sm lg:border-l-3 lg:border-l-transparent ${
              activeSection === 'ai-preferences' 
                ? 'bg-[rgba(21,101,192,0.12)] text-[#1565c0] border-l-[#1565c0] font-semibold lg:border-l-[#1565c0]' 
                : 'hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]'
            } whitespace-nowrap lg:whitespace-normal`}
            onClick={() => setActiveSection('ai-preferences')}
            data-section="ai-preferences"
          >
            <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>AI Preferences</span>
          </div>
          <div 
            className={`flex items-center gap-3 px-6 py-3 text-[#546e7a] cursor-pointer transition-all border-l-[3px] border-l-transparent text-sm lg:border-l-3 lg:border-l-transparent ${
              activeSection === 'account' 
                ? 'bg-[rgba(21,101,192,0.12)] text-[#1565c0] border-l-[#1565c0] font-semibold lg:border-l-[#1565c0]' 
                : 'hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]'
            } whitespace-nowrap lg:whitespace-normal`}
            onClick={() => setActiveSection('account')}
            data-section="account"
          >
            <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Account</span>
          </div>
        </div>
        <div className="flex-1 p-10 overflow-y-auto">
          <div id="settingsGeneralSection" className={`${activeSection === 'general' ? 'block' : 'hidden'}`}>
            <h2 className="text-2xl font-semibold text-[#37474f] mb-6">General</h2>
            <div className="flex justify-between items-center py-4 border-b border-[rgba(21,101,192,0.1)]">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-[#37474f]">AI Model</span>
                <span className="text-xs text-[#546e7a] mt-1">Choose your preferred AI model for chat responses (only enabled models are shown)</span>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedModel} 
                  onChange={(e) => handleModelChange(e.target.value as AIModel)}
                  disabled={savingModel || !user || user.is_guest}
                  className="px-3 py-2 border border-[rgba(21,101,192,0.2)] rounded text-sm text-[#37474f] bg-white cursor-pointer outline-none transition-colors min-w-[200px] focus:border-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(() => {
                    // Filter models based on visible_models, but always include the currently selected model
                    const availableModels = selectedVisibleModels && selectedVisibleModels.length > 0
                      ? AI_MODELS.filter(m => selectedVisibleModels.includes(m.value) || m.value === selectedModel)
                      : AI_MODELS;
                    
                    // Group by provider
                    const gptModels = availableModels.filter(m => m.group === 'GPT');
                    const geminiModels = availableModels.filter(m => m.group === 'Gemini');
                    
                    return (
                      <>
                        {gptModels.length > 0 && (
                          <optgroup label="GPT Models">
                            {gptModels.map(model => (
                              <option key={model.value} value={model.value}>{model.label}</option>
                            ))}
                          </optgroup>
                        )}
                        {geminiModels.length > 0 && (
                          <optgroup label="Gemini Models">
                            {geminiModels.map(model => (
                              <option key={model.value} value={model.value}>{model.label}</option>
                            ))}
                          </optgroup>
                        )}
                        {availableModels.length === 0 && (
                          <option value="" disabled>No models enabled. Please enable models in AI Preferences.</option>
                        )}
                      </>
                    );
                  })()}
                </select>
                {savingModel && (
                  <span className="text-xs text-[#546e7a]">Saving...</span>
                )}
              </div>
            </div>
            {/* Add more settings options */}
          </div>
          <div id="settingsAIPreferencesSection" className={`${activeSection === 'ai-preferences' ? 'block' : 'hidden'}`}>
            <h2 className="text-2xl font-semibold text-[#37474f] mb-6">AI Preferences</h2>
            
            {/* Default AI Model */}
            <div className="flex justify-between items-center py-4 border-b border-[rgba(21,101,192,0.1)]">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-[#37474f]">Default AI Model</span>
                <span className="text-xs text-[#546e7a] mt-1">Choose your preferred AI model for chat responses (only enabled models below are available)</span>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedModel} 
                  onChange={(e) => handleModelChange(e.target.value as AIModel)}
                  disabled={savingModel || !user || user.is_guest}
                  className="px-3 py-2 border border-[rgba(21,101,192,0.2)] rounded text-sm text-[#37474f] bg-white cursor-pointer outline-none transition-colors min-w-[200px] focus:border-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(() => {
                    // Filter models based on visible_models, but always include the currently selected model
                    const availableModels = selectedVisibleModels && selectedVisibleModels.length > 0
                      ? AI_MODELS.filter(m => selectedVisibleModels.includes(m.value) || m.value === selectedModel)
                      : AI_MODELS;
                    
                    // Group by provider
                    const gptModels = availableModels.filter(m => m.group === 'GPT');
                    const geminiModels = availableModels.filter(m => m.group === 'Gemini');
                    
                    return (
                      <>
                        {gptModels.length > 0 && (
                          <optgroup label="GPT Models">
                            {gptModels.map(model => (
                              <option key={model.value} value={model.value}>{model.label}</option>
                            ))}
                          </optgroup>
                        )}
                        {geminiModels.length > 0 && (
                          <optgroup label="Gemini Models">
                            {geminiModels.map(model => (
                              <option key={model.value} value={model.value}>{model.label}</option>
                            ))}
                          </optgroup>
                        )}
                        {availableModels.length === 0 && (
                          <option value="" disabled>No models enabled. Please enable models below.</option>
                        )}
                      </>
                    );
                  })()}
                </select>
                {savingModel && (
                  <span className="text-xs text-[#546e7a]">Saving...</span>
                )}
              </div>
            </div>

            {/* Visible Models Selection */}
            <div className="py-4 border-b border-[rgba(21,101,192,0.1)]">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-sm font-medium text-[#37474f]">Available Models in Chat</span>
                    <span className="text-xs text-[#546e7a] mt-1">Select which AI models should appear in the chat dropdown</span>
                  </div>
                  {savingVisibleModels && (
                    <span className="text-xs text-[#546e7a]">Saving...</span>
                  )}
                </div>
                
                {/* GPT Models Group */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#37474f]">GPT Models</h3>
                    <button
                      onClick={() => handleSelectAllModels('GPT')}
                      disabled={savingVisibleModels || !user || user.is_guest}
                      className="text-xs text-[#1565c0] hover:text-[#0d47a1] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {AI_MODELS.filter(m => m.group === 'GPT').every(m => selectedVisibleModels.includes(m.value))
                        ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AI_MODELS.filter(m => m.group === 'GPT').map(model => (
                      <label
                        key={model.value}
                        className="flex items-center gap-2 p-2 rounded border border-[rgba(21,101,192,0.2)] cursor-pointer hover:bg-[rgba(21,101,192,0.05)] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVisibleModels.includes(model.value)}
                          onChange={() => handleVisibleModelToggle(model.value)}
                          disabled={savingVisibleModels || !user || user.is_guest}
                          className="w-4 h-4 text-[#1565c0] border-[rgba(21,101,192,0.3)] rounded focus:ring-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-[#37474f]">{model.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gemini Models Group */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#37474f]">Gemini Models</h3>
                    <button
                      onClick={() => handleSelectAllModels('Gemini')}
                      disabled={savingVisibleModels || !user || user.is_guest}
                      className="text-xs text-[#1565c0] hover:text-[#0d47a1] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {AI_MODELS.filter(m => m.group === 'Gemini').every(m => selectedVisibleModels.includes(m.value))
                        ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AI_MODELS.filter(m => m.group === 'Gemini').map(model => (
                      <label
                        key={model.value}
                        className="flex items-center gap-2 p-2 rounded border border-[rgba(21,101,192,0.2)] cursor-pointer hover:bg-[rgba(21,101,192,0.05)] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVisibleModels.includes(model.value)}
                          onChange={() => handleVisibleModelToggle(model.value)}
                          disabled={savingVisibleModels || !user || user.is_guest}
                          className="w-4 h-4 text-[#1565c0] border-[rgba(21,101,192,0.3)] rounded focus:ring-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-[#37474f]">{model.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedVisibleModels.length === 0 && (
                  <div className="mt-3 p-3 bg-[#fff3cd] border border-[#ffc107] rounded text-xs text-[#856404]">
                    ⚠️ No models selected. At least one model must be visible in the chat dropdown.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div id="settingsAccountSection" className={`${activeSection === 'account' ? 'block' : 'hidden'}`}>
            <h2 className="text-2xl font-semibold text-[#37474f] mb-6">Account</h2>
            <div className="flex justify-between items-center py-4 border-b border-[rgba(21,101,192,0.1)]">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-[#37474f]">Username</span>
                <span className="text-xs text-[#546e7a] mt-1">{user?.username || 'Not set'}</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-4 border-b border-[rgba(21,101,192,0.1)]">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-[#37474f]">Email</span>
                <span className="text-xs text-[#546e7a] mt-1">{user?.email || 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

