'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { studyChatQuestionsApi, userPreferencesApi } from '@/lib/api';

interface StudyChatQuestionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyId?: string | null;
  chatSessionId?: string | null;
  onSave?: () => void;
}

const DEFAULT_STUDY_CHAT_QUESTIONS = [
  "What is the primary objective of this study?",
  "What are the inclusion and exclusion criteria?",
  "What is the study design and methodology?",
  "What are the primary and secondary endpoints?",
  "What are the potential risks and benefits?",
];

export default function StudyChatQuestionSettingsModal({ 
  isOpen, 
  onClose, 
  studyId, 
  chatSessionId,
  onSave 
}: StudyChatQuestionSettingsModalProps) {
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
    const hasChatSessionId = chatSessionId && typeof chatSessionId === 'string' && chatSessionId.trim() !== '';
    const notLoading = !isLoading && !isSaving;
    const hasValidQuestions = validQuestions.length > 0;
    
    // Can save if:
    // 1. Has chatSessionId (save to session, optionally as default), OR
    // 2. No chatSessionId but saveAsDefault is true (save as default only)
    const result = hasValidQuestions && notLoading && (hasChatSessionId || saveAsDefault);
    
    return result;
  }, [chatSessionId, isLoading, isSaving, questions, saveAsDefault]);

  // Load questions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadQuestions();
      setError(null);
      setSuccessMessage(null);
      // If no chatSessionId, default to saving as default (since that's the only option)
      const hasChatSessionId = chatSessionId && typeof chatSessionId === 'string' && chatSessionId.trim() !== '';
      setSaveAsDefault(!hasChatSessionId);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [isOpen, studyId, chatSessionId]);

  const loadQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await studyChatQuestionsApi.get(studyId || undefined, chatSessionId || undefined);
      if (response && response.success && response.questions && response.questions.length > 0) {
        setQuestions([...response.questions]);
      } else {
        // If no questions returned, use defaults
        setQuestions([...DEFAULT_STUDY_CHAT_QUESTIONS]);
      }
    } catch (error) {
      console.error('Error loading study chat questions:', error);
      // On error, use default questions instead of showing error
      setQuestions([...DEFAULT_STUDY_CHAT_QUESTIONS]);
      setError(null); // Don't show error, just use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestions = [...questions, ''];
    setQuestions(newQuestions);
    setError(null);
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
    if (value.length > 500) {
      setError(`Question ${index + 1} exceeds maximum length of 500 characters`);
      return;
    }
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
    if (!error || !error.includes('exceeds maximum length')) {
      setError(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
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
    
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestion);
    
    setQuestions(newQuestions);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setError(null);
  };

  const handleSave = async () => {
    const hasChatSessionId = chatSessionId && typeof chatSessionId === 'string' && chatSessionId.trim() !== '';
    
    // If no chatSessionId and saveAsDefault is false, show error
    if (!hasChatSessionId && !saveAsDefault) {
      setError('Please select "Save as my default study chat questions" to save without a session, or perform a search to create a session first.');
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
      const response = await studyChatQuestionsApi.update(
        studyId || undefined,
        chatSessionId || undefined,
        validQuestions,
        saveAsDefault === true // Explicitly convert to boolean
      );
      
      if (response && (response.success === true || (typeof response === 'object' && 'success' in response && response.success))) {
        const message = response.message || 'Questions saved successfully!';
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
      console.error('Error saving study chat questions:', error);
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
    // Reset saveAsDefault based on whether chatSessionId exists
    const hasChatSessionId = chatSessionId && typeof chatSessionId === 'string' && chatSessionId.trim() !== '';
    setSaveAsDefault(!hasChatSessionId);
    setError(null);
    setSuccessMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content question-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Configure Study Chat Questions</h2>
            <p className="modal-subtitle">
              {chatSessionId ? 'Customize questions for this session and optionally save as default' : 'Customize and save your default study chat questions'}
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className="modal-body">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading questions...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="error-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="success-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>{successMessage}</span>
                </div>
              )}

              {/* <div className="questions-list"> */}
                {questions.length === 0 ? (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No questions yet. Add your first question below.</p>
                  </div>
                ) : (
                  questions.map((question, index) => (
                    <div
                      key={index}
                      className={`question-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                      draggable={!isSaving}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <div className="drag-handle" title="Drag to reorder">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="7" x2="19" y2="7"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <line x1="5" y1="17" x2="19" y2="17"/>
                        </svg>
                      </div>

                      <div className="question-input-wrapper">
                        <input
                          type="text"
                          className="question-input"
                          value={question}
                          onChange={(e) => handleUpdateQuestion(index, e.target.value)}
                          placeholder={`Enter question ${index + 1}...`}
                          maxLength={500}
                          disabled={isSaving}
                        />
                      </div>

                      <button
                        type="button"
                        className="control-btn remove"
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
                
                <button 
                  type="button" 
                  className="add-question-btn" 
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
              {/* </div> */}
            </>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            <label className="checkbox-label footer-checkbox">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                disabled={isSaving || isLoading}
              />
              <span className="checkbox-label-text">
                {chatSessionId && chatSessionId.trim() !== '' 
                  ? 'Also save as my default study questions' 
                  : 'Save as my default study chat questions'}
              </span>
            </label>
          </div>
          <div className="footer-right">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleReset} 
              disabled={isSaving || isLoading}
            >
              Reset
            </button>
            <div className="footer-actions">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose} 
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleSave} 
              disabled={!canSave}
              title={
                !canSave
                  ? (questions.filter(q => q && typeof q === 'string' && q.trim().length > 0).length === 0
                      ? 'Please add at least one question'
                      : (!chatSessionId && !saveAsDefault
                          ? 'Please select "Save as my default study chat questions" or create a session first'
                          : ''))
                  : ''
              }
            >
              {isSaving ? (
                <>
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

