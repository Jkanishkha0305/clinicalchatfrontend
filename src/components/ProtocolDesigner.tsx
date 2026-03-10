"use client";

import { useState, useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { searchApi, chatSessionsApi } from "@/lib/api";
import { normalizeReportHtml } from "@/lib/reportHtml";
import { useToastHelpers } from "@/lib/toast";
import {
  updateSessionFromChat,
  setCurrentSession,
  fetchSession,
} from "@/store/slices/sessionsSlice";
import { setReports, setGeneratingReport } from "@/store/slices/chatSlice";
import { ProtocolReport } from "@/lib/types";
import {
  ActivityIcon,
  CheckCircleIcon,
  CloseIcon,
  FileTextIcon,
  FlaskIcon,
  LayersIcon,
  MessageIcon,
  PrinterIcon,
  SearchIcon,
  SparklesIcon,
} from "@/components/ui/icons";

const formatOptions = [
  {
    value: "standard",
    title: "Standard",
    description: "Minimal formatting for a quick plain-text readout.",
  },
  {
    value: "styled",
    title: "Styled",
    description: "Balanced presentation for everyday protocol reviews.",
  },
  {
    value: "professional",
    title: "Professional",
    description: "A cleaner executive layout for sharing and export.",
  },
] as const;

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
      const normalizedReport = normalizeReportHtml(report);
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
            ${normalizedReport}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <section className="workspace-panel-light overflow-hidden">
        <div className="border-b border-slate-200/80 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="workspace-kicker workspace-kicker-light">
                <FileTextIcon className="h-4 w-4" />
                Protocol studio
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                Generate protocol direction from similar trials.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start with a condition, add intervention context when it helps, and keep every saved report inside the
                active workspace session.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <div className="workspace-subpanel">
                <div className="workspace-label">
                  <CheckCircleIcon className="h-4 w-4 text-sky-600" />
                  Saved reports
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{reports?.length ?? 0}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Protocol, study-chat, and conversation reports stay attached to the current workspace.
                </p>
              </div>

              <div className="workspace-subpanel">
                <div className="workspace-label">
                  <SearchIcon className="h-4 w-4 text-sky-600" />
                  Session mode
                </div>
                <div className="mt-2 text-base font-semibold text-slate-950">
                  {currentSessionId ? "Connected to saved session" : isGuest ? "Guest session" : "Ready for generation"}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Authenticated users reload from the backend. Guest mode keeps reports available in local workspace
                  state.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="workspace-field">
                <label className="workspace-label" htmlFor="protocol-condition">
                  <FileTextIcon className="h-4 w-4 text-sky-600" />
                  Condition or disease
                </label>
                <input
                  id="protocol-condition"
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g. Type 2 diabetes, metastatic NSCLC"
                  className="workspace-input"
                />
              </div>

              <div className="workspace-field">
                <label className="workspace-label" htmlFor="protocol-intervention">
                  <FlaskIcon className="h-4 w-4 text-sky-600" />
                  Intervention or treatment
                </label>
                <input
                  id="protocol-intervention"
                  type="text"
                  value={intervention}
                  onChange={(e) => setIntervention(e.target.value)}
                  placeholder="Optional. e.g. GLP-1 agonist, CAR-T"
                  className="workspace-input"
                />
              </div>
            </div>

            <div className="workspace-subpanel">
              <div className="workspace-label">
                <LayersIcon className="h-4 w-4 text-sky-600" />
                Output format
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {formatOptions.map((option) => {
                  const isActive = format === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-[24px] border px-4 py-4 transition ${
                        isActive
                          ? "border-sky-300 bg-sky-50 shadow-[0_18px_40px_rgba(14,165,233,0.12)]"
                          : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={option.value}
                        checked={format === option.value}
                        onChange={(e) =>
                          setFormat(e.target.value as "standard" | "styled" | "professional")
                        }
                        className="sr-only"
                      />
                      <div className="text-sm font-semibold text-slate-900">{option.title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{option.description}</p>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {loading ? (
                abortControllerRef.current ? (
                  <button
                    onClick={() => {
                      if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                        abortControllerRef.current = null;
                        setLoading(false);
                        dispatch(setGeneratingReport(false));
                        setReport("");
                        setMetadata(null);
                      }
                    }}
                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                  >
                    <CloseIcon className="h-4 w-4" />
                    Stop generation
                  </button>
                ) : (
                  <button
                    disabled
                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-5 text-sm font-semibold text-slate-500"
                  >
                    <ActivityIcon className="h-4 w-4 animate-pulse" />
                    Generating report
                  </button>
                )
              ) : (
                <button
                  onClick={handleGenerateReport}
                  disabled={loading || !condition.trim()}
                  className="workspace-button-primary min-w-[220px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Generate protocol report
                </button>
              )}

              <p className="text-sm leading-6 text-slate-500">
                Reports are generated from similar trials and saved back into the active workspace when a session is
                available.
              </p>
            </div>
          </div>

          <aside className="workspace-subpanel">
            <div className="workspace-label">
              <SparklesIcon className="h-4 w-4 text-sky-600" />
              Best results
            </div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <p>Use the primary condition only. Add intervention detail when it materially changes comparable trials.</p>
              <p>Choose the professional format when you expect to export or share the output.</p>
              <p>Use the same session while iterating so search, chat, and protocol reports stay connected.</p>
            </div>
          </aside>
        </div>
      </section>

      {loading && (
        <section className="workspace-panel-light">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <ActivityIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Analyzing similar trials</h3>
              <p className="mt-1 text-sm text-slate-600">
                The system is assembling comparable studies and synthesizing protocol guidance.
              </p>
            </div>
          </div>
        </section>
      )}

      {loadingReports && (
        <section className="workspace-panel-light">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <ActivityIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Loading saved reports</h3>
              <p className="mt-1 text-sm text-slate-600">Fetching prior protocol outputs for this workspace session.</p>
            </div>
          </div>
        </section>
      )}

      {!loadingReports && reports && reports.length > 0 && (
        <section className="space-y-3">
          <div className="px-1">
            <div className="workspace-kicker workspace-kicker-light">
              <CheckCircleIcon className="h-4 w-4" />
              Generated reports
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-950">Saved outputs ({reports.length})</h3>
          </div>

          {reports.map((savedReport: ProtocolReport, idx: number) => {
            const isExpanded = expandedReports.has(idx);
            const isNewest = idx === 0;
            const isNewlyGenerated = newlyGeneratedReportId === idx;
            const isChatReport = savedReport.metadata?.report_type === "chat_report";
            const isStudyChatReport = savedReport.metadata?.report_type === "study_chat_report";
            const isGenerating = savedReport.metadata?.isGenerating || !savedReport.report || savedReport.report.trim() === "";
            const ReportIcon = isStudyChatReport ? FlaskIcon : isChatReport ? MessageIcon : FileTextIcon;
            const reportLabel = isStudyChatReport
              ? "Study chat report"
              : isChatReport
                ? "Conversation report"
                : "Protocol report";

            return (
              <article
                key={idx}
                className={`workspace-panel-light overflow-hidden transition ${
                  isNewlyGenerated ? "ring-2 ring-sky-300/70" : ""
                }`}
              >
                <button
                  type="button"
                  className={`w-full px-4 py-4 text-left transition sm:px-5 ${
                    isNewest ? "bg-sky-50/80" : "bg-white/70 hover:bg-slate-50"
                  } ${isExpanded ? "border-b border-slate-200/80" : ""}`}
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-700">
                          <ReportIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {isNewest ? "Newest " : ""}
                              {reportLabel}
                              {!isNewest && ` #${reports.length - idx}`}
                            </span>
                            {isNewlyGenerated ? (
                              <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                                New
                              </span>
                            ) : null}
                            {isGenerating ? (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                                Generating
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {savedReport.created_at
                              ? `Generated ${new Date(savedReport.created_at).toLocaleString()}`
                              : "Pending report"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <div>
                          <span className="font-medium text-slate-900">Condition:</span> {savedReport.condition}
                        </div>
                        {savedReport.intervention ? (
                          <div>
                            <span className="font-medium text-slate-900">Intervention:</span> {savedReport.intervention}
                          </div>
                        ) : null}
                        {isStudyChatReport && savedReport.metadata?.study_id ? (
                          <div>
                            <span className="font-medium text-slate-900">Study ID:</span> {savedReport.metadata.study_id}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const printWindow = window.open("", "_blank");
                          if (printWindow && savedReport.report) {
                            const normalizedReport = normalizeReportHtml(savedReport.report);
                            printWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Protocol Research Report</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
                                    h1, h2, h3 { color: #0f172a; }
                                  </style>
                                </head>
                                <body>
                                  ${normalizedReport}
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                            printWindow.print();
                          }
                        }}
                        className="workspace-button-ghost"
                        title="Print report"
                      >
                        <PrinterIcon className="h-4 w-4" />
                        Print
                      </button>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="bg-white px-4 py-5 sm:px-5">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                          <ActivityIcon className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-slate-950">Generating report</h4>
                          <p className="mt-1 text-sm text-slate-600">
                            AI is still analyzing comparable trials and assembling the output.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="workspace-rich-text prose prose-sm max-w-none prose-slate"
                        dangerouslySetInnerHTML={{
                          __html: normalizeReportHtml(savedReport.report || ""),
                        }}
                      />
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}

      {!loadingReports && (!reports || reports.length === 0) && !loading && (
        <section className="workspace-empty-state">
          <div className="workspace-empty-icon">
            <FileTextIcon className="h-7 w-7" />
          </div>
          <h3>Your protocol reports will appear here</h3>
          <p>Generate the first report above to turn discovery context into a structured protocol recommendation.</p>
        </section>
      )}
    </div>
  );
}
