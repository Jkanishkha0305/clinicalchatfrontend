'use client';

import { useState, useEffect, useRef } from 'react';
import { searchApi, chatSessionsApi } from '@/lib/api';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useToastHelpers } from '@/lib/toast';
import { setReports } from '@/store/slices/chatSlice';

interface ChatReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export default function ChatReportModal({ isOpen, onClose, sessionId }: ChatReportModalProps) {
  const dispatch = useAppDispatch();
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string>('');
  const [format, setFormat] = useState<'standard' | 'styled' | 'professional'>('styled');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [metadata, setMetadata] = useState<{
    messages_count: number;
    studies_analyzed: number;
    total_matching: number;
    condition: string;
    intervention: string | null;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setReport('');
      setMetadata(null);
      setFormat('styled'); // Reset to default format
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleGenerateReport = async () => {
    if (!sessionId) {
      toast.error('Session ID is required');
      return;
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    try {
      const response = await searchApi.generateChatReport(sessionId, format, abortController);

      // Check if request was aborted before processing response
      if (abortController?.signal.aborted) {
        setReport('');
        setMetadata(null);
        return;
      }

      if (response.success) {
        setReport(response.report);
        setMetadata(response.metadata);
        
        // Only reload session reports if request wasn't aborted
        if (!abortController?.signal.aborted) {
        try {
          const sessionResponse = await chatSessionsApi.get(sessionId);
          if (sessionResponse.success && sessionResponse.session) {
            if (sessionResponse.session.reports && sessionResponse.session.reports.length > 0) {
              dispatch(setReports(sessionResponse.session.reports));
            }
          }
        } catch (err) {
          console.error('Error reloading session reports:', err);
        }
        
        toast.success('Chat report generated and saved to session!');
        }
      } else {
        toast.error('Failed to generate chat report');
      }
    } catch (error) {
      // Check if error is due to abort
      if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('cancel') || error.message?.includes('aborted'))) {
        // Clear report state when cancelled
        setReport('');
        setMetadata(null);
        // Don't show toast for user-initiated cancellations
        return;
      } else {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate chat report'
      );
      }
    } finally {
      setLoading(false);
      // Clear abort controller reference when done
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && report) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Chat Conversation Research Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #667eea; }
              h2 { color: #764ba2; margin-top: 20px; }
              .metadata { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            ${report}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        display: isOpen ? 'block' : 'none',
        position: 'fixed',
        zIndex: 2000,
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#fefefe',
          margin: '5% auto',
          padding: '20px',
          border: '1px solid #888',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#667eea' }}>💬 Chat Conversation Research Report</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#888',
              padding: '0',
              width: '30px',
              height: '30px',
              lineHeight: '30px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#333'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
          >
            &times;
          </button>
        </div>

        {!report ? (
          <div>
            <h2 style={{ color: '#667eea', marginBottom: '20px' }}>AI Chat Conversation Report Generator</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Generate a comprehensive research report based on your chat conversation about clinical trials.
            </p>
            
            {/* Format Selection */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#333' }}>
                Report Format <span style={{ color: 'red' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', borderRadius: '6px', border: `2px solid ${format === 'standard' ? '#667eea' : '#ddd'}`, background: format === 'standard' ? '#f0f4ff' : 'white', flex: '1', minWidth: '150px' }}>
                  <input
                    type="radio"
                    name="format"
                    value="standard"
                    checked={format === 'standard'}
                    onChange={(e) => setFormat(e.target.value as 'standard' | 'styled' | 'professional')}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>Standard</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Plain text, minimal styling</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', borderRadius: '6px', border: `2px solid ${format === 'styled' ? '#667eea' : '#ddd'}`, background: format === 'styled' ? '#f0f4ff' : 'white', flex: '1', minWidth: '150px' }}>
                  <input
                    type="radio"
                    name="format"
                    value="styled"
                    checked={format === 'styled'}
                    onChange={(e) => setFormat(e.target.value as 'standard' | 'styled' | 'professional')}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>Styled</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Gradient header, modern design</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', borderRadius: '6px', border: `2px solid ${format === 'professional' ? '#667eea' : '#ddd'}`, background: format === 'professional' ? '#f0f4ff' : 'white', flex: '1', minWidth: '150px' }}>
                  <input
                    type="radio"
                    name="format"
                    value="professional"
                    checked={format === 'professional'}
                    onChange={(e) => setFormat(e.target.value as 'standard' | 'styled' | 'professional')}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>Professional</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Clean, academic style</div>
                  </div>
                </label>
              </div>
            </div>

            {loading ? (
              abortControllerRef.current ? (
                <button
                  onClick={() => {
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                      abortControllerRef.current = null;
                      // Clear loading state immediately
                      setLoading(false);
                      // Clear any partial report state
                      setReport('');
                      setMetadata(null);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '20px',
                  }}
                >
                  ⏹️ Stop Generation
                </button>
              ) : (
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'not-allowed',
                    marginTop: '20px',
                  }}
                >
                  ⏳ Generating Report...
                </button>
              )
            ) : (
            <button
              onClick={handleGenerateReport}
              disabled={loading || !sessionId}
              style={{
                width: '100%',
                padding: '15px',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '20px',
              }}
            >
              {loading ? '⏳ Generating Report...' : '✨ Generate Chat Report'}
            </button>
            )}

            {/* Loading indicator */}
            {loading && (
              <div style={{
                display: 'block',
                textAlign: 'center',
                marginTop: '30px',
                padding: '40px',
                background: '#f8f9fa',
                borderRadius: '8px',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
                <h3 style={{ color: '#667eea' }}>Generating Report...</h3>
                <p style={{ color: '#666' }}>AI is analyzing your conversation to generate the report</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {metadata && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <p style={{ margin: '5px 0' }}>
                  <strong>Based on:</strong> {metadata.messages_count} messages in conversation
                </p>
                {metadata.condition && (
                  <p style={{ margin: '5px 0' }}>
                    <strong>Primary Focus:</strong> {metadata.condition}
                  </p>
                )}
                {metadata.intervention && (
                  <p style={{ margin: '5px 0' }}>
                    <strong>Intervention:</strong> {metadata.intervention}
                  </p>
                )}
                <p style={{ margin: '5px 0' }}>
                  <strong>Studies Analyzed:</strong> {metadata.studies_analyzed} studies (out of {metadata.total_matching || 0} total matching)
                </p>
              </div>
            )}
            <div
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                marginBottom: '20px',
              }}
              dangerouslySetInnerHTML={{ __html: report }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handlePrint}
                style={{
                  padding: '10px 20px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🖨️ Print
              </button>
              <button
                onClick={() => {
                  setReport('');
                  setMetadata(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Generate New Report
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

