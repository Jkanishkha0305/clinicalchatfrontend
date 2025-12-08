'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { chatQuestionsApi, userPreferencesApi } from '@/lib/api';

interface QuestionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string | null;
  onSave?: () => void;
}

export default function QuestionSettingsModal({ isOpen, onClose, sessionId, onSave }: QuestionSettingsModalProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Memoized check for save button enablement - updates when dependencies change
  const canSave = useMemo(() => {
    // Filter valid questions (non-empty strings after trimming, max 500 chars)
    const validQuestions = questions.filter(q => {
      if (!q || typeof q !== 'string') return false;
      const trimmed = q.trim();
      return trimmed.length > 0 && trimmed.length <= 500;
    });
    
    // Check all conditions
    const hasSessionId = sessionId && typeof sessionId === 'string' && sessionId.trim() !== '';
    const notLoading = !isLoading && !isSaving;
    const hasValidQuestions = validQuestions.length > 0;
    
    // Can save if:
    // 1. Has sessionId (save to session, optionally as default), OR
    // 2. No sessionId but saveAsDefault is true (save as default only)
    const result = hasValidQuestions && notLoading && (hasSessionId || saveAsDefault);
    
    // Always log in development to help debug
    console.log('canSave check:', {
      hasSessionId,
      sessionId: sessionId || 'null/undefined',
      saveAsDefault,
      notLoading,
      isLoading,
      isSaving,
      questionsCount: questions.length,
      questions: questions,
      validQuestionsCount: validQuestions.length,
      validQuestions: validQuestions,
      canSave: result
    });
    
    return result;
  }, [sessionId, isLoading, isSaving, questions, saveAsDefault]);

  // Load questions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadQuestions();
      setError(null);
      setSuccessMessage(null);
      // If no sessionId, default to saving as default (since that's the only option)
      const hasSessionId = sessionId && typeof sessionId === 'string' && sessionId.trim() !== '';
      setSaveAsDefault(!hasSessionId);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [isOpen, sessionId]);

  const loadQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await chatQuestionsApi.get(sessionId || undefined);
      if (response && response.success && response.questions) {
        setQuestions([...response.questions]);
      } else {
        setError('Failed to load questions');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setError('Failed to load questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestions = [...questions, ''];
    setQuestions(newQuestions);
    setError(null);
    // Force re-render by updating state
    console.log('Added question, new questions array:', newQuestions);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      setError('At least one question is required');
      return;
    }
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    setError(null);
  };

  const handleUpdateQuestion = (index: number, value: string) => {
    // Validate length (max 500 characters as per server validation)
    if (value.length > 500) {
      setError(`Question ${index + 1} exceeds maximum length of 500 characters`);
      return;
    }
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
    // Clear error when user types (unless it's a validation error we just set)
    if (!error || !error.includes('exceeds maximum length')) {
      setError(null);
    }
    // Debug log
    const validCount = updated.filter(q => q && typeof q === 'string' && q.trim().length > 0).length;
    console.log('Updated question:', { index, value, validCount, totalCount: updated.length });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newQuestions = [...questions];
    const draggedQuestion = newQuestions[draggedIndex];
    
    // Remove the dragged item
    newQuestions.splice(draggedIndex, 1);
    
    // Insert at new position
    newQuestions.splice(dropIndex, 0, draggedQuestion);
    
    const updatedQuestions = [...newQuestions];
    setQuestions(updatedQuestions);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setError(null);
  };

  const handleSave = async () => {
    const hasSessionId = sessionId && typeof sessionId === 'string' && sessionId.trim() !== '';
    
    // If no sessionId and saveAsDefault is false, show error
    if (!hasSessionId && !saveAsDefault) {
      setError('Please select "Save as my default questions" to save without a session, or perform a search to create a session first.');
      return;
    }

    // Filter out empty questions and trim whitespace
    const validQuestions = questions
      .map(q => q && typeof q === 'string' ? q.trim() : '')
      .filter(q => q.length > 0);
    
    if (validQuestions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    // Check for maximum length (server validation: max 500 characters per question)
    const tooLongQuestions = validQuestions.filter(q => q.length > 500);
    if (tooLongQuestions.length > 0) {
      const firstTooLongIndex = validQuestions.findIndex(q => q.length > 500);
      setError(`Question ${firstTooLongIndex + 1} exceeds maximum length of 500 characters`);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Saving questions:', {
        hasSessionId,
        sessionId: sessionId || 'null/undefined',
        questionsCount: validQuestions.length,
        saveAsDefault,
        questions: validQuestions
      });

      let response;
      
      if (hasSessionId) {
        // If sessionId exists, use chatQuestionsApi.update (can save to session and optionally as default)
        response = await chatQuestionsApi.update(
          sessionId.trim(), 
          validQuestions, 
          saveAsDefault === true // Explicitly convert to boolean
        );
      } else if (saveAsDefault) {
        // If no sessionId but saveAsDefault is true, update user preferences directly
        response = await userPreferencesApi.update({ default_chat_questions: validQuestions });
      } else {
        // This shouldn't happen due to validation above, but just in case
        throw new Error('Invalid save configuration');
      }
      
      console.log('Save response:', response);

      // Check if response is successful (response interceptor may have already extracted data)
      if (response && (response.success === true || (typeof response === 'object' && 'success' in response && response.success))) {
        const responseObj = response as any;
        const message = responseObj.message || 'Questions saved successfully!';
        setSuccessMessage(message);
        
        // Update questions in state to match what was saved
        setQuestions(validQuestions);
        
        // Call onSave callback after a short delay to show success message
        setTimeout(() => {
          if (onSave) {
            onSave();
          }
          onClose();
        }, 1000);
      } else {
        // Handle case where response might be in different format
        const errorMsg = (response && typeof response === 'object' && 'message' in response) 
          ? response.message 
          : 'Failed to save questions. Please try again.';
        setError(errorMsg);
      }
    } catch (error: any) {
      console.error('Error saving questions:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        data: error?.response?.data
      });
      
      // Extract error message from response
      let errorMessage = 'Failed to save questions. Please try again.';
      if (error && typeof error === 'object') {
        // Check for Axios error response
        if (error.response && error.response.data) {
          const data = error.response.data;
          if (data.message) {
            errorMessage = data.message;
          } else if (data.error) {
            errorMessage = data.error;
          } else if (typeof data === 'string') {
            errorMessage = data;
          }
        } else if (error.message && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadQuestions();
    // Reset saveAsDefault based on whether sessionId exists
    const hasSessionId = sessionId && typeof sessionId === 'string' && sessionId.trim() !== '';
    setSaveAsDefault(!hasSessionId);
    setError(null);
    setSuccessMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 sm:p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[700px] max-h-[85vh] h-auto flex flex-col shadow-[0_24px_48px_rgba(0,0,0,0.3)] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[#e0e0e0] flex justify-between items-start bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-t-2xl">
          <div>
            <h2 className="m-0 text-2xl font-semibold text-white">Configure Chat Questions</h2>
            <p className="m-1 mt-1 text-sm text-white/90 font-normal">
              {sessionId ? 'Customize questions for this session and optionally save as default' : 'Customize and save your default questions'}
            </p>
          </div>
          <button className="text-white bg-white/20 w-8 h-8 flex items-center justify-center rounded-md transition-all hover:bg-white/30" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-4">
              <div className="w-10 h-10 border-4 border-[#e0e0e0] border-t-[#0066cc] rounded-full animate-spin"></div>
              <p className="m-0 text-sm text-[#546e7a]">Loading questions...</p>
            </div>
          ) : (
            <>

              {error && (
                <div className="flex gap-2.5 px-4 py-3 bg-[#ffebee] border-l-4 border-[#f44336] rounded-md mb-4 text-sm text-[#c62828] items-center">
                  <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex gap-2.5 px-4 py-3 bg-[#e8f5e9] border-l-4 border-[#4caf50] rounded-md mb-4 text-sm text-[#2e7d32] items-center">
                  <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 mb-5 max-h-[400px] overflow-y-auto pr-2">
                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 gap-4 text-[#999] text-center">
                    <svg className="opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p className="m-0 text-sm">No questions yet. Add your first question below.</p>
                  </div>
                ) : (
                  questions.map((question, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 items-center p-4 bg-white border-2 rounded-lg mb-2.5 transition-all cursor-move relative ${
                        draggedIndex === index ? 'opacity-50 border-[#0066cc] bg-[#e3f2fd]' : ''
                      } ${
                        dragOverIndex === index ? 'border-[#0066cc] bg-[#f0f7ff] -translate-y-0.5 shadow-[0_4px_12px_rgba(0,102,204,0.2)]' : 'border-[#e0e0e0]'
                      } hover:border-[#0066cc] hover:shadow-[0_2px_8px_rgba(0,102,204,0.1)]`}
                      draggable={!isSaving}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      {/* Drag Handle (Left) - Three horizontal lines */}
                      <div className="flex items-center justify-center w-8 h-8 text-[#999] cursor-grab active:cursor-grabbing transition-colors hover:text-[#0066cc] flex-shrink-0" title="Drag to reorder">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="7" x2="19" y2="7"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <line x1="5" y1="17" x2="19" y2="17"/>
                        </svg>
                      </div>

                      {/* Input Field (Center) */}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <input
                          type="text"
                          className="w-full px-4 py-3 border-2 rounded-md text-sm transition-all bg-white border-[#e0e0e0] outline-none focus:border-[#0066cc] focus:shadow-[0_0_0_3px_rgba(0,102,204,0.1)] disabled:bg-[#f5f5f5] disabled:cursor-not-allowed"
                          value={question}
                          onChange={(e) => handleUpdateQuestion(index, e.target.value)}
                          placeholder={`Enter question ${index + 1}...`}
                          maxLength={500}
                          disabled={isSaving}
                        />
                      </div>

                      {/* Remove Button (Right) */}
                      <button
                        type="button"
                        className="w-9 h-9 flex items-center justify-center border border-[#ffcdd2] bg-white rounded-md cursor-pointer transition-all p-0 text-[#d32f2f] hover:bg-[#ffebee] hover:border-[#f44336] hover:text-[#f44336] hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                        onClick={() => handleRemoveQuestion(index)}
                        disabled={questions.length <= 1 || isSaving}
                        title="Remove question"
                        aria-label="Remove question"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
                
                <button 
                  type="button" 
                  className="w-full px-4 py-3.5 bg-white border-2 border-dashed border-[#0066cc] rounded-lg cursor-pointer text-sm font-medium text-[#0066cc] transition-all mt-2 flex items-center justify-center gap-2 hover:bg-[#e3f2fd] hover:border-[#0052a3] hover:text-[#0052a3] disabled:opacity-50 disabled:cursor-not-allowed disabled:border-[#ccc] disabled:text-[#999]" 
                  onClick={handleAddQuestion}
                  disabled={isSaving || questions.length >= 20}
                  title={questions.length >= 20 ? 'Maximum 20 questions allowed' : 'Add new question'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Question {questions.length > 0 && `(${questions.length}/20)`}
                </button>
            </>
          )}
        </div>

        <div className="p-5 sm:p-6 border-t border-[#e0e0e0] flex justify-between items-center gap-3 bg-[#f8f9fa] rounded-b-2xl flex-col sm:flex-row">
          <div className="flex items-center flex-1">
            <label className="flex items-start gap-3 cursor-pointer m-0 p-0">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                disabled={isSaving || isLoading}
                className="w-5 h-5 cursor-pointer mt-0.5 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-[#37474f] font-medium whitespace-nowrap">
                {sessionId && sessionId.trim() !== '' 
                  ? 'Also save as my default questions' 
                  : 'Save as my default questions'}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <button 
              type="button" 
              className="px-5 py-2.5 bg-[#6c757d] text-white border-none rounded text-sm cursor-pointer transition-all hover:bg-[#5a6268] disabled:opacity-60 disabled:cursor-not-allowed" 
              onClick={handleReset} 
              disabled={isSaving || isLoading}
            >
              Reset
            </button>
            <div className="flex gap-3">
            <button 
              type="button" 
              className="px-5 py-2.5 bg-[#6c757d] text-white border-none rounded text-sm cursor-pointer transition-all hover:bg-[#5a6268] disabled:opacity-60 disabled:cursor-not-allowed" 
              onClick={onClose} 
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="px-5 py-2.5 bg-[#0066cc] text-white border-none rounded text-sm cursor-pointer transition-all flex items-center gap-2 hover:bg-[#0052a3] disabled:bg-[#ccc] disabled:cursor-not-allowed" 
              onClick={handleSave} 
              disabled={!canSave}
              title={
                !canSave
                  ? (questions.filter(q => q && typeof q === 'string' && q.trim().length > 0).length === 0
                      ? 'Please add at least one question'
                      : (!sessionId && !saveAsDefault
                          ? 'Please select "Save as my default questions" or create a session first'
                          : ''))
                  : ''
              }
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Questions'
              )}
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
