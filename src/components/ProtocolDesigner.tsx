"use client";

import { useState, useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { searchApi, chatSessionsApi } from "@/lib/api";
import { useToastHelpers } from "@/lib/toast";
import {
  updateSessionFromChat,
  setCurrentSession,
  fetchSession,
} from "@/store/slices/sessionsSlice";
import { setReports, setGeneratingReport } from "@/store/slices/chatSlice";
import { ProtocolReport } from "@/lib/types";

export default function ProtocolDesigner() {
  const { currentSessionId, sessions } = useAppSelector((state) => state.sessions);
  const { reports, generatingReport } = useAppSelector((state) => state.chat);
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const toast = useToastHelpers();
  
  const [condition, setCondition] = useState('');
  const [intervention, setIntervention] = useState('');
  const [format, setFormat] = useState<'standard' | 'styled' | 'professional'>('styled');
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Sync local loading state with Redux state (for persistence across tab switches)
  // This ensures loading state persists when switching tabs
  useEffect(() => {
    if (generatingReport) {
      setLoading(true);
    } else if (!generatingReport && loading) {
      // Only clear loading if Redux state is false and we're currently loading
      // This prevents clearing loading state prematurely
      setLoading(false);
    }
  }, [generatingReport, loading]);
  const [report, setReport] = useState<string>('');
  const [metadata, setMetadata] = useState<{
    trials_analyzed: number;
    total_matching: number;
    condition: string;
    intervention: string | null;
  } | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<number>>(new Set());
  const [newlyGeneratedReportId, setNewlyGeneratedReportId] = useState<number | null>(null);
  
  const isGuest = user?.is_guest === true;

  // Load reports and last_report_filters when session changes or component mounts
  useEffect(() => {
    const loadSessionData = async () => {
      // For guest users without a session, don't clear existing data
      // Just ensure reports are displayed from Redux state
      if (!currentSessionId) {
        // Only clear if we have reports in Redux (meaning we're switching from a session to no session)
        // For guest users, keep the existing reports in Redux and display them
        if (!isGuest && reports.length > 0) {
          dispatch(setReports([]));
          setCondition('');
          setIntervention('');
        }
        // For guest users, keep existing reports and form fields
        // Reports are already in Redux, so they'll be displayed
        // Expand the first report if there are any
        if (isGuest && reports && reports.length > 0) {
          setExpandedReports(new Set([0]));
          setNewlyGeneratedReportId(0);
          
          // Restore form fields from the newest report (first in sorted array)
          const newestReport = reports[0];
          if (newestReport) {
            setCondition(newestReport.condition || '');
            setIntervention(newestReport.intervention || '');
          }
        }
        return;
      }

      setLoadingReports(true);
      try {
        const result = await dispatch(fetchSession(currentSessionId)).unwrap();
        
        // Load last_report_filters into form
        if (result.last_report_filters) {
          setCondition(result.last_report_filters.condition || '');
          setIntervention(result.last_report_filters.intervention || '');
        } else {
          // Only clear form if no report filters and not a guest user
          if (!isGuest) {
            setCondition('');
            setIntervention('');
          }
        }
        
        // Load reports and sort by date (newest first)
        if (result.reports && result.reports.length > 0) {
          const sortedReports = [...result.reports].sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA; // Newest first
          });
          dispatch(setReports(sortedReports));
          
          // Expand the first (newest) report by default
          setExpandedReports(new Set([0]));
          setNewlyGeneratedReportId(0);
        } else {
          // Only clear reports if not a guest user
          if (!isGuest) {
            dispatch(setReports([]));
          }
          setExpandedReports(new Set());
          setNewlyGeneratedReportId(null);
        }
      } catch (error) {
        console.error('Error loading session data:', error);
        toast.error('Failed to load session data');
        // Only clear on error if not a guest user
        if (!isGuest) {
          setCondition('');
          setIntervention('');
          dispatch(setReports([]));
        }
      } finally {
        setLoadingReports(false);
      }
    };

    loadSessionData();
  }, [currentSessionId, dispatch, toast, isGuest, reports.length]);

  const handleGenerateReport = async () => {
    if (!condition.trim()) {
      toast.error('Please enter a condition to generate a report');
      return;
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    dispatch(setGeneratingReport(true)); // Set Redux state for persistence
    setReport('');
    setMetadata(null);
    
    try {
      const response = await searchApi.generateProtocolReport(
        condition.trim(),
        intervention.trim() || undefined,
        currentSessionId || undefined,
        format,
        abortController
      );

      // Check if request was aborted before processing response
      if (abortController?.signal.aborted) {
        setReport('');
        setMetadata(null);
        return;
      }

      // Only process response if request wasn't aborted
      if (!abortController?.signal.aborted && response.success) {
        // Update session if sessionInfo is returned
        if (response.sessionInfo) {
          if (currentSessionId !== response.sessionInfo.id) {
            dispatch(updateSessionFromChat({
              sessionId: response.sessionInfo.id,
              title: response.sessionInfo.title,
              description: response.sessionInfo.description,
            }));
            dispatch(setCurrentSession(response.sessionInfo.id));
          }
          
          // For authenticated users, reload session to get the updated report from server
          // The server creates a placeholder first, then updates it with the full content
          if (!isGuest && !abortController?.signal.aborted) {
            setLoadingReports(true);
            try {
              const sessionResponse = await chatSessionsApi.get(response.sessionInfo.id);
              if (sessionResponse.success && sessionResponse.session) {
                // Update reports from server (includes the newly generated report)
                if (sessionResponse.session.reports && sessionResponse.session.reports.length > 0) {
                  const sortedReports = [...sessionResponse.session.reports].sort((a, b) => {
                    const dateA = new Date(a.created_at || 0).getTime();
                    const dateB = new Date(b.created_at || 0).getTime();
                    return dateB - dateA; // Newest first
                  });
                  dispatch(setReports(sortedReports));
                  
                  // Expand the newly generated report (first one, newest)
                  setNewlyGeneratedReportId(0);
                  setExpandedReports(new Set([0]));
                }
                
                // Update last_report_filters in form
                if (sessionResponse.session.last_report_filters) {
                  setCondition(sessionResponse.session.last_report_filters.condition || '');
                  setIntervention(sessionResponse.session.last_report_filters.intervention || '');
                }
              }
            } catch (err) {
              console.error('Error reloading session reports:', err);
              toast.error('Report generated but failed to reload session data');
            } finally {
              setLoadingReports(false);
            }
          } else if (!abortController?.signal.aborted) {
            // For guest users, create report object from response and add to Redux
            const newReport: ProtocolReport = {
              condition: condition.trim(),
              intervention: intervention.trim() || null,
              report: response.report,
              created_at: new Date().toISOString(),
              metadata: response.metadata || {},
            };
            
            const currentReports = reports || [];
            const updatedReports = [newReport, ...currentReports].sort((a, b) => {
              const dateA = new Date(a.created_at || 0).getTime();
              const dateB = new Date(b.created_at || 0).getTime();
              return dateB - dateA; // Newest first
            });
            dispatch(setReports(updatedReports));
            
            // Expand the newly generated report (first one, newest)
            setNewlyGeneratedReportId(0);
            setExpandedReports(new Set([0]));
          }
        } else if (!abortController?.signal.aborted) {
          // No session (guest user without session) - add report to Redux
          const newReport: ProtocolReport = {
            condition: condition.trim(),
            intervention: intervention.trim() || null,
            report: response.report,
            created_at: new Date().toISOString(),
            metadata: response.metadata || {},
          };
          
          const currentReports = reports || [];
          const updatedReports = [newReport, ...currentReports].sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA; // Newest first
          });
          dispatch(setReports(updatedReports));
          
          // Expand the newly generated report (first one, newest)
          setNewlyGeneratedReportId(0);
          setExpandedReports(new Set([0]));
        }
        
        // Clear the temporary report display state
        setReport('');
        setMetadata(null);
        
        // Only show success toast if not aborted
        if (!abortController?.signal.aborted) {
        toast.success('Protocol report generated and saved successfully!');
        }
      } else if (!abortController?.signal.aborted) {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      // Check if error is due to abort or cancellation
      if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('cancel') || error.message?.includes('cancelled') || error.message?.includes('aborted'))) {
        // Clear report state when cancelled
        setReport('');
        setMetadata(null);
        // Don't show toast for user-initiated cancellations
      } else {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate report'
      );
      }
    } finally {
      setLoading(false);
      dispatch(setGeneratingReport(false)); // Clear Redux state
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
            <title>Protocol Research Report</title>
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-semibold  mb-3">
            AI Protocol Research Report Generator
          </h2>
          <div className="w-full h-[1px] mb-4 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
          <p className="text-gray-600 text-sm">
            Generate evidence-based protocol recommendations by analyzing
            similar clinical trials in our database.
          </p>
        </div>
      </div>

      {/* Input Form Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Condition Input */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Condition or Disease
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g., Type 2 Diabetes, Lung Cancer"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
            />
          </div>

          {/* Intervention Input */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              Intervention/Treatment
              <span className="text-gray-400 text-xs font-normal">
                (Optional)
              </span>
            </label>
            <input
              type="text"
              value={intervention}
              onChange={(e) => setIntervention(e.target.value)}
              placeholder="e.g., GLP-1 Agonist, Chemotherapy"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 hover:border-gray-400"
            />
          </div>
        </div>

        {/* Format Selection */}
        <div className="mt-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block mb-2 text-xs font-semibold text-gray-700">
            Report Format <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <label
              className={`flex items-center cursor-pointer p-3 rounded-lg border-2 transition-all ${
                format === "standard"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="format"
                value="standard"
                checked={format === "standard"}
                onChange={(e) =>
                  setFormat(e.target.value as "standard" | "styled" | "professional")
                }
                className="mr-2 cursor-pointer"
              />
              <div>
                <div className="text-sm font-semibold text-gray-800">Standard</div>
                <div className="text-xs text-gray-600">Plain text, minimal styling</div>
              </div>
            </label>
            <label
              className={`flex items-center cursor-pointer p-3 rounded-lg border-2 transition-all ${
                format === "styled"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="format"
                value="styled"
                checked={format === "styled"}
                onChange={(e) =>
                  setFormat(e.target.value as "standard" | "styled" | "professional")
                }
                className="mr-2 cursor-pointer"
              />
              <div>
                <div className="text-sm font-semibold text-gray-800">Styled</div>
                <div className="text-xs text-gray-600">Gradient header, modern design</div>
              </div>
            </label>
            <label
              className={`flex items-center cursor-pointer p-3 rounded-lg border-2 transition-all ${
                format === "professional"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="format"
                value="professional"
                checked={format === "professional"}
                onChange={(e) =>
                  setFormat(e.target.value as "standard" | "styled" | "professional")
                }
                className="mr-2 cursor-pointer"
              />
              <div>
                <div className="text-sm font-semibold text-gray-800">Professional</div>
                <div className="text-xs text-gray-600">Clean, academic style</div>
              </div>
            </label>
          </div>
        </div>

        {/* Generate/Stop Button */}
        {loading ? (
          abortControllerRef.current ? (
        <button
              onClick={() => {
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                  abortControllerRef.current = null;
                  // Clear loading state immediately
                  setLoading(false);
                  dispatch(setGeneratingReport(false));
                  // Clear any partial report state
                  setReport('');
                  setMetadata(null);
                }
              }}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 hover:shadow-md active:scale-95"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              Stop Generation
            </button>
          ) : (
            <button
              disabled
              className="w-full py-3 rounded-lg text-white text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 bg-gray-400 cursor-not-allowed opacity-60"
            >
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating Report...
            </button>
          )
          ) : (
          <button
            onClick={handleGenerateReport}
            disabled={loading || !condition.trim()}
            className={`w-full py-3 rounded-lg text-white text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 ${
              loading || !condition.trim()
                ? "bg-gray-400 cursor-not-allowed opacity-60"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-md active:scale-95"
            }`}
          >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Generate Protocol Report
        </button>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6 shadow-sm">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
              <svg
                className="animate-spin h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Analyzing Similar Trials...
            </h3>
            <p className="text-gray-600 text-sm">
              AI is reviewing historical trial data to generate your report
            </p>
          </div>
        </div>
      )}

      {/* Loading Reports Indicator */}
      {loadingReports && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6 shadow-sm">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
              <svg
                className="animate-spin h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Loading Reports...
            </h3>
            <p className="text-gray-600 text-sm">
              Fetching saved protocol reports
            </p>
          </div>
        </div>
      )}

      {/* Display All Saved Reports */}
      {!loadingReports && reports && reports.length > 0 && (
        <div className="mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Generated Reports ({reports.length})
            </h3>
          </div>

          {reports.map((savedReport: ProtocolReport, idx: number) => {
            const isExpanded = expandedReports.has(idx);
            const isNewest = idx === 0;
            const isNewlyGenerated = newlyGeneratedReportId === idx;
            const isChatReport =
              savedReport.metadata?.report_type === "chat_report";
            const isStudyChatReport =
              savedReport.metadata?.report_type === "study_chat_report";
            const isGenerating =
              savedReport.metadata?.isGenerating ||
              !savedReport.report ||
              savedReport.report.trim() === "";

            return (
              <div
                key={idx}
                className={`bg-white rounded-xl shadow-sm mb-3 overflow-hidden transition-all duration-200 ${
                  isNewlyGenerated
                    ? "border-2 border-indigo-400"
                    : "border border-gray-200"
                }`}
              >
                {/* Report Header */}
                <div
                  className={`p-4 cursor-pointer transition-colors ${
                    isNewest
                      ? "bg-gradient-to-r from-indigo-50 to-purple-50"
                      : "bg-gray-50 hover:bg-gray-100"
                  } ${isExpanded ? "border-b border-gray-200" : ""}`}
                  onClick={() => {
                    const newExpanded = new Set(expandedReports);
                    if (isExpanded) {
                      newExpanded.delete(idx);
                    } else {
                      newExpanded.add(idx);
                    }
                    setExpandedReports(newExpanded);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Report Title */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {isStudyChatReport
                            ? "🔬"
                            : isChatReport
                            ? "💬"
                            : "📋"}
                        </span>
                        <strong className="text-sm font-semibold text-indigo-600">
                          {isNewest ? "✨ Newest " : ""}
                          {isStudyChatReport
                            ? "Study Chat Report"
                            : isChatReport
                            ? "Chat Conversation Report"
                            : "Protocol Report"}
                          {!isNewest && ` #${reports.length - idx}`}
                        </strong>
                        {isNewlyGenerated && (
                          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                            NEW
                          </span>
                        )}
                        {isGenerating && (
                          <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold animate-pulse">
                            ⏳ GENERATING
                          </span>
                        )}
                      </div>

                      {/* Report Details */}
                      <div className="text-xs text-gray-600 space-y-1 ml-7">
                        {isStudyChatReport &&
                          savedReport.metadata?.study_id && (
                            <div>
                              <span className="font-medium">Study ID:</span>{" "}
                              {savedReport.metadata.study_id}
                            </div>
                          )}
                        <div>
                          <span className="font-medium">Condition:</span>{" "}
                          {savedReport.condition}
                        </div>
                        {savedReport.intervention && (
                          <div>
                            <span className="font-medium">Intervention:</span>{" "}
                            {savedReport.intervention}
                          </div>
                        )}
                        {savedReport.created_at && (
                          <div className="text-gray-400 text-xs mt-1">
                            Generated:{" "}
                            {new Date(savedReport.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const printWindow = window.open("", "_blank");
                          if (printWindow && savedReport.report) {
                            printWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Protocol Research Report</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 20px; }
                                    h1 { color: #667eea; }
                                    h2 { color: #764ba2; margin-top: 20px; }
                                  </style>
                                </head>
                                <body>
                                  ${savedReport.report}
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                            printWindow.print();
                          }
                        }}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        title="Print Report"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        Print
                      </button>
                      <svg
                        className={`w-5 h-5 text-indigo-500 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Report Content - Collapsible */}
                {isExpanded && (
                  <div className="p-5 bg-white">
                    {isGenerating ? (
                      <div className="text-center py-10">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-3">
                          <svg
                            className="animate-spin h-6 w-6 text-indigo-600"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
                          Generating Report...
                        </h3>
                        <p className="text-gray-600 text-sm">
                          AI is analyzing similar trials and generating your
                          protocol report
                        </p>
                      </div>
                    ) : (
                      <div
                        className="report-content protocol-report-content prose prose-sm max-w-none"
                        style={{ lineHeight: "1.6", color: "#333" }}
                        dangerouslySetInnerHTML={{
                          __html: (savedReport.report || "")
                            .replace(/\\n/g, "\n")
                            .replace(/\\"/g, '"')
                            .replace(/\\'/g, "'"),
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No Reports Message */}
      {!loadingReports && (!reports || reports.length === 0) && !loading && (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            No Reports Yet
          </h3>
          <p className="text-gray-600 text-sm">
            Generate your first protocol report using the form above.
          </p>
        </div>
      )}
    </div>
  );
}

