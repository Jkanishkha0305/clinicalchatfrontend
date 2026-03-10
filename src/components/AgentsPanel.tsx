'use client';

import type { ComponentType, FormEvent, SVGProps } from 'react';
import { useState } from 'react';
import axios from 'axios';
import { BACKEND_SERVER_URL } from '@/lib/constants/api.constant';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  BotIcon,
  ChartIcon,
  DownloadIcon,
  FileTextIcon,
  FlaskIcon,
  LayersIcon,
  PrinterIcon,
  SearchIcon,
  SparklesIcon,
} from '@/components/ui/icons';

const API_BASE_URL = BACKEND_SERVER_URL;
const AGENTIC_API_BASE_URL = process.env.NEXT_PUBLIC_AGENTIC_API_BASE_URL || API_BASE_URL;

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type ToneName = 'amber' | 'sky' | 'emerald' | 'violet' | 'indigo' | 'teal';
type ViewMode = 'rendered' | 'plain';

interface AgentFeature {
  id: string;
  title: string;
  description: string;
  icon: IconComponent;
  endpoint: string;
  tone: ToneName;
  inputs: Array<{
    name: string;
    label: string;
    type: 'text' | 'select';
    placeholder?: string;
    options?: string[];
    required?: boolean;
  }>;
}

const FEATURE_TONES: Record<
  ToneName,
  {
    iconSurface: string;
    iconColor: string;
    badge: string;
    emphasis: string;
    emphasisTitle: string;
  }
> = {
  amber: {
    iconSurface: 'border-amber-200 bg-amber-50',
    iconColor: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    emphasis: 'border-amber-200 bg-amber-50',
    emphasisTitle: 'text-amber-900',
  },
  sky: {
    iconSurface: 'border-sky-200 bg-sky-50',
    iconColor: 'text-sky-700',
    badge: 'bg-sky-100 text-sky-700',
    emphasis: 'border-sky-200 bg-sky-50',
    emphasisTitle: 'text-sky-900',
  },
  emerald: {
    iconSurface: 'border-emerald-200 bg-emerald-50',
    iconColor: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    emphasis: 'border-emerald-200 bg-emerald-50',
    emphasisTitle: 'text-emerald-900',
  },
  violet: {
    iconSurface: 'border-violet-200 bg-violet-50',
    iconColor: 'text-violet-700',
    badge: 'bg-violet-100 text-violet-700',
    emphasis: 'border-violet-200 bg-violet-50',
    emphasisTitle: 'text-violet-900',
  },
  indigo: {
    iconSurface: 'border-indigo-200 bg-indigo-50',
    iconColor: 'text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-700',
    emphasis: 'border-indigo-200 bg-indigo-50',
    emphasisTitle: 'text-indigo-900',
  },
  teal: {
    iconSurface: 'border-teal-200 bg-teal-50',
    iconColor: 'text-teal-700',
    badge: 'bg-teal-100 text-teal-700',
    emphasis: 'border-teal-200 bg-teal-50',
    emphasisTitle: 'text-teal-900',
  },
};

const AGENT_FEATURES: AgentFeature[] = [
  {
    id: 'amendment-risk',
    title: 'Amendment Risk',
    description: 'Predict likely amendment pressure across design complexity, feasibility, and operational burden.',
    icon: AlertTriangleIcon,
    tone: 'amber',
    endpoint: '/api/amendment-risk',
    inputs: [{ name: 'nctId', label: 'NCT ID', type: 'text', placeholder: 'e.g. NCT04831775', required: true }],
  },
  {
    id: 'design-patterns',
    title: 'Design Patterns',
    description: 'Discover recurring trial design structures across a condition, phase, or intervention type.',
    icon: LayersIcon,
    tone: 'violet',
    endpoint: '/api/design-patterns',
    inputs: [
      { name: 'condition', label: 'Condition', type: 'text', placeholder: 'e.g. Diabetes', required: true },
      { name: 'phase', label: 'Phase', type: 'text', placeholder: 'Optional. e.g. Phase 3' },
      { name: 'interventionType', label: 'Intervention type', type: 'text', placeholder: 'Optional. e.g. Drug' },
    ],
  },
  {
    id: 'soa-composer',
    title: 'Schedule of Assessments',
    description: 'Generate a more complete SoA draft using multi-agent synthesis across comparable studies.',
    icon: FileTextIcon,
    tone: 'emerald',
    endpoint: '/api/soa-composer',
    inputs: [
      { name: 'condition', label: 'Condition', type: 'text', placeholder: 'e.g. Diabetes', required: true },
      { name: 'phase', label: 'Phase', type: 'text', placeholder: 'Optional. e.g. Phase 3' },
      {
        name: 'interventionType',
        label: 'Intervention type',
        type: 'text',
        placeholder: 'Optional. e.g. Drug or device',
      },
    ],
  },
  {
    id: 'agentic-search',
    title: 'Agentic Search',
    description: 'Expand terminology and search strategy when a plain query misses important domain language.',
    icon: SparklesIcon,
    tone: 'sky',
    endpoint: '/api/agentic-search',
    inputs: [
      { name: 'query', label: 'Search query', type: 'text', placeholder: 'e.g. Heart failure treatment', required: true },
    ],
  },
  {
    id: 'protocol-analysis',
    title: 'Protocol Analysis',
    description: 'Run deeper protocol analysis with specialized agents focused on design quality and feasibility.',
    icon: BotIcon,
    tone: 'indigo',
    endpoint: '/api/multi-agent-analysis',
    inputs: [{ name: 'nctId', label: 'NCT ID', type: 'text', placeholder: 'e.g. NCT04831775', required: true }],
  },
  {
    id: 'trial-comparison',
    title: 'Trial Comparison',
    description: 'Compare multiple studies across design, operations, endpoints, and strategic positioning.',
    icon: ChartIcon,
    tone: 'teal',
    endpoint: '/api/compare-trials',
    inputs: [
      {
        name: 'nctIds',
        label: 'NCT IDs',
        type: 'text',
        placeholder: 'Comma-separated. e.g. NCT04831775, NCT04838392',
        required: true,
      },
    ],
  },
];

const AGENTIC_FEATURE_IDS = new Set(AGENT_FEATURES.map((feature) => feature.id));

export default function AgentsPanel() {
  const [selectedFeature, setSelectedFeature] = useState<AgentFeature | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('rendered');

  const handleFeatureClick = (feature: AgentFeature) => {
    setSelectedFeature(feature);
    setFormData({});
    setResults(null);
    setError(null);
    setViewMode('rendered');
  };

  const stripHtml = (html: string): string => {
    if (!html) {
      return '';
    }

    if (typeof window === 'undefined') {
      return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
    }

    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;

      const paragraphs = tmp.querySelectorAll('p, div, br, h1, h2, h3, h4, h5, h6, li');
      paragraphs.forEach((element) => {
        if (element.tagName === 'BR') {
          element.replaceWith('\n');
        } else {
          const textNode = document.createTextNode('\n\n');
          element.after(textNode);
        }
      });

      let text = tmp.textContent || tmp.innerText || '';
      text = text
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/^\s+|\s+$/gm, '')
        .trim();

      return text;
    } catch (stripError) {
      console.error('stripHtml error:', stripError);

      return html
        .replace(/<\/?(p|div|br|h[1-6]|li|ul|ol)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
    }
  };

  const getAnalysisHtml = (analysis: any) => analysis?.content_html ?? analysis?.content ?? analysis?.content_raw ?? '';

  const getAnalysisText = (analysis: any) => analysis?.content_text ?? stripHtml(getAnalysisHtml(analysis));

  const getResultHtml = (result: any, htmlKey: string, legacyKey: string, rawKey?: string) =>
    result?.[htmlKey] ?? result?.[legacyKey] ?? (rawKey ? result?.[rawKey] : '') ?? '';

  const getResultText = (result: any, textKey: string, htmlKey: string, legacyKey: string, rawKey?: string) =>
    result?.[textKey] ?? stripHtml(getResultHtml(result, htmlKey, legacyKey, rawKey));

  const generatePDF = async () => {
    if (!results || !selectedFeature) {
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        return;
      }

      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${selectedFeature.title} - Analysis Results</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            h1 { color: #0f172a; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; }
            h2 { color: #0f172a; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            h3 { color: #334155; margin-top: 20px; }
            h4 { color: #475569; margin-top: 15px; }
            .metadata { background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 30px; }
            .section { margin-bottom: 24px; padding: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; }
            .highlight { background: #f8fafc; padding: 20px; border: 1px solid #cbd5e1; border-radius: 14px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border: 1px solid #e2e8f0; }
            th { background: #f8fafc; font-weight: 600; }
            ul, ol { margin: 10px 0; padding-left: 30px; }
            li { margin: 8px 0; }
            strong { color: #0f172a; }
            @media print {
              body { margin: 0; padding: 20px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>${selectedFeature.title}</h1>
          <div class="metadata">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Analysis Type:</strong> ${selectedFeature.description}</p>
          </div>
      `;

      if (selectedFeature.id === 'amendment-risk' && results.agent_analyses) {
        htmlContent += `
          <div class="section">
            <h2>Trial Information</h2>
            <p><strong>NCT ID:</strong> ${results.trial?.nct_id}</p>
            <p><strong>Title:</strong> ${results.trial?.title}</p>
          </div>
        `;
        results.agent_analyses.forEach((analysis: any) => {
          htmlContent += `
            <div class="section">
              <h2>${analysis.agent}</h2>
              <p><strong>Focus Areas:</strong> ${(analysis.focus_areas || []).join(', ')}</p>
              ${getAnalysisHtml(analysis)}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Executive Risk Assessment</h2>
            ${getResultHtml(results, 'risk_assessment_html', 'risk_assessment', 'risk_assessment_raw')}
          </div>
        `;
      } else if (selectedFeature.id === 'design-patterns' && results.agent_analyses) {
        results.agent_analyses.forEach((analysis: any) => {
          htmlContent += `
            <div class="section">
              <h2>${analysis.agent}</h2>
              ${getAnalysisHtml(analysis)}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Strategic Insights</h2>
            ${getResultHtml(results, 'strategic_insights_html', 'strategic_insights', 'strategic_insights_raw')}
          </div>
        `;
      } else if (selectedFeature.id === 'soa-composer' && results.agent_analyses) {
        results.agent_analyses.forEach((analysis: any) => {
          htmlContent += `
            <div class="section">
              <h2>${analysis.agent}</h2>
              ${getAnalysisHtml(analysis)}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Complete Schedule of Assessments</h2>
            ${getResultHtml(results, 'complete_soa_html', 'complete_soa', 'complete_soa_raw')}
          </div>
        `;
      } else if (selectedFeature.id === 'protocol-analysis' && results.agent_analyses) {
        results.agent_analyses.forEach((analysis: any) => {
          htmlContent += `
            <div class="section">
              <h2>${analysis.agent}</h2>
              ${getAnalysisHtml(analysis)}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Executive Summary</h2>
            ${getResultHtml(results, 'executive_summary_html', 'executive_summary', 'executive_summary_raw')}
          </div>
        `;
      } else if (selectedFeature.id === 'trial-comparison' && results.comparisons) {
        Object.entries(results.comparisons).forEach(([key, sectionHtml]: [string, any]) => {
          htmlContent += `
            <div class="section">
              <h2>${key.replace(/_/g, ' ').toUpperCase()}</h2>
              ${sectionHtml}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Strategic Synthesis</h2>
            ${results.strategic_synthesis}
          </div>
        `;
      }

      htmlContent += `
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const downloadResults = () => {
    if (!results || !selectedFeature) {
      return;
    }

    let content = `${selectedFeature.title}\n`;
    content += `${'='.repeat(selectedFeature.title.length)}\n\n`;
    content += `Analysis Results\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;

    if (selectedFeature.id === 'amendment-risk' && results.agent_analyses) {
      content += `Trial: ${results.trial?.nct_id} - ${results.trial?.title}\n\n`;
      results.agent_analyses.forEach((analysis: any) => {
        content += `${analysis.agent}\n${'-'.repeat(analysis.agent.length)}\n`;
        content += `Focus Areas: ${(analysis.focus_areas || []).join(', ')}\n\n`;
        content += `${getAnalysisText(analysis)}\n\n`;
      });
      content += `EXECUTIVE RISK ASSESSMENT\n${'='.repeat(25)}\n`;
      content += `${getResultText(results, 'risk_assessment_text', 'risk_assessment_html', 'risk_assessment', 'risk_assessment_raw')}\n\n`;
    } else if (selectedFeature.id === 'design-patterns' && results.agent_analyses) {
      results.agent_analyses.forEach((analysis: any) => {
        content += `${analysis.agent}\n${'-'.repeat(analysis.agent.length)}\n`;
        content += `${getAnalysisText(analysis)}\n\n`;
      });
      content += `STRATEGIC INSIGHTS\n${'='.repeat(18)}\n`;
      content += `${getResultText(results, 'strategic_insights_text', 'strategic_insights_html', 'strategic_insights', 'strategic_insights_raw')}\n\n`;
    } else if (selectedFeature.id === 'soa-composer' && results.agent_analyses) {
      results.agent_analyses.forEach((analysis: any) => {
        content += `${analysis.agent}\n${'-'.repeat(analysis.agent.length)}\n`;
        content += `${getAnalysisText(analysis)}\n\n`;
      });
      content += `COMPLETE SCHEDULE OF ASSESSMENTS\n${'='.repeat(33)}\n`;
      content += `${getResultText(results, 'complete_soa_text', 'complete_soa_html', 'complete_soa', 'complete_soa_raw')}\n\n`;
    } else if (selectedFeature.id === 'agentic-search') {
      content += `Original Query: ${results.original_query}\n\n`;
      content += `Terminology Expansion:\n${results.terminology_expansion}\n\n`;
      content += `Search Strategy:\n${results.search_strategy}\n\n`;
      content += `Enhanced Search Terms:\n${results.enhanced_search_terms}\n`;
    } else if (selectedFeature.id === 'protocol-analysis' && results.agent_analyses) {
      results.agent_analyses.forEach((analysis: any) => {
        content += `${analysis.agent}\n${'-'.repeat(analysis.agent.length)}\n`;
        content += `${getAnalysisText(analysis)}\n\n`;
      });
      content += `EXECUTIVE SUMMARY\n${'='.repeat(17)}\n`;
      content += `${getResultText(results, 'executive_summary_text', 'executive_summary_html', 'executive_summary', 'executive_summary_raw')}\n\n`;
    } else if (selectedFeature.id === 'trial-comparison' && results.comparisons) {
      Object.entries(results.comparisons).forEach(([key, sectionHtml]: [string, any]) => {
        const title = key.replace(/_/g, ' ').toUpperCase();
        content += `${title}\n${'-'.repeat(title.length)}\n`;
        content += `${stripHtml(sectionHtml as string)}\n\n`;
      });
      content += `STRATEGIC SYNTHESIS\n${'='.repeat(19)}\n`;
      content += `${stripHtml(results.strategic_synthesis)}\n\n`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedFeature.id}-${Date.now()}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      let requestData: any = { ...formData };

      if (selectedFeature?.id === 'trial-comparison' && formData.nctIds) {
        requestData = {
          nctIds: formData.nctIds
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id),
        };
      }

      const baseUrl = selectedFeature && AGENTIC_FEATURE_IDS.has(selectedFeature.id) ? AGENTIC_API_BASE_URL : API_BASE_URL;
      const response = await axios.post(`${baseUrl}${selectedFeature?.endpoint}`, requestData);
      setResults(response.data);
    } catch (submitError: any) {
      setError(submitError.response?.data?.error || submitError.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderRichContent = (html: string, text: string) =>
    viewMode === 'rendered' ? (
      <div className="workspace-rich-text prose prose-sm max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: html }} />
    ) : (
      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{text}</div>
    );

  const renderAnalysisCards = (analyses: any[], tone: (typeof FEATURE_TONES)[ToneName]) => (
    <div className="space-y-4">
      {analyses.map((analysis: any, index: number) => (
        <div key={index} className="workspace-subpanel">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-base font-semibold text-slate-950">{analysis.agent}</h4>
            {analysis.focus_areas?.length ? (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                {analysis.focus_areas.join(', ')}
              </span>
            ) : null}
          </div>
          <div className="mt-4">{renderRichContent(getAnalysisHtml(analysis), getAnalysisText(analysis))}</div>
        </div>
      ))}
    </div>
  );

  const renderResults = () => {
    if (!results || !selectedFeature) {
      return null;
    }

    const tone = FEATURE_TONES[selectedFeature.tone];
    const FeatureIcon = selectedFeature.icon;

    return (
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewMode('rendered')}
              className={`workspace-chip ${viewMode === 'rendered' ? 'workspace-chip-active' : ''}`}
            >
              <LayersIcon className="h-4 w-4" />
              Formatted
            </button>
            <button
              type="button"
              onClick={() => setViewMode('plain')}
              className={`workspace-chip ${viewMode === 'plain' ? 'workspace-chip-active' : ''}`}
            >
              <FileTextIcon className="h-4 w-4" />
              Plain text
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadResults} className="workspace-button-ghost">
              <DownloadIcon className="h-4 w-4" />
              Download text
            </button>
            <button type="button" onClick={generatePDF} className="workspace-button-secondary">
              <PrinterIcon className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>

        <div className="workspace-panel-light overflow-hidden">
          <div className="border-b border-slate-200/80 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${tone.iconSurface} ${tone.iconColor}`}>
                <FeatureIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Analysis results</h3>
                <p className="text-sm text-slate-600">{selectedFeature.title}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            {selectedFeature.id === 'amendment-risk' && results.agent_analyses ? (
              <>
                <div className={`rounded-[24px] border px-4 py-4 ${tone.emphasis}`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Trial</div>
                  <h4 className={`mt-2 text-base font-semibold ${tone.emphasisTitle}`}>{results.trial?.nct_id}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{results.trial?.title}</p>
                </div>
                {renderAnalysisCards(results.agent_analyses, tone)}
                <div className={`rounded-[28px] border px-5 py-5 ${tone.emphasis}`}>
                  <h4 className={`text-lg font-semibold ${tone.emphasisTitle}`}>Executive risk assessment</h4>
                  <div className="mt-4">
                    {renderRichContent(
                      getResultHtml(results, 'risk_assessment_html', 'risk_assessment', 'risk_assessment_raw'),
                      getResultText(results, 'risk_assessment_text', 'risk_assessment_html', 'risk_assessment', 'risk_assessment_raw')
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {selectedFeature.id === 'design-patterns' && results.agent_analyses ? (
              <>
                {renderAnalysisCards(results.agent_analyses, tone)}
                <div className={`rounded-[28px] border px-5 py-5 ${tone.emphasis}`}>
                  <h4 className={`text-lg font-semibold ${tone.emphasisTitle}`}>Strategic insights</h4>
                  <div className="mt-4">
                    {renderRichContent(
                      getResultHtml(results, 'strategic_insights_html', 'strategic_insights', 'strategic_insights_raw'),
                      getResultText(results, 'strategic_insights_text', 'strategic_insights_html', 'strategic_insights', 'strategic_insights_raw')
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {selectedFeature.id === 'soa-composer' && results.agent_analyses ? (
              <>
                {renderAnalysisCards(results.agent_analyses, tone)}
                <div className={`rounded-[28px] border px-5 py-5 ${tone.emphasis}`}>
                  <h4 className={`text-lg font-semibold ${tone.emphasisTitle}`}>Complete schedule of assessments</h4>
                  <div className="mt-4">
                    {renderRichContent(
                      getResultHtml(results, 'complete_soa_html', 'complete_soa', 'complete_soa_raw'),
                      getResultText(results, 'complete_soa_text', 'complete_soa_html', 'complete_soa', 'complete_soa_raw')
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {selectedFeature.id === 'agentic-search' && results.terminology_expansion ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="workspace-subpanel">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Original query</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{results.original_query}</p>
                </div>
                <div className="workspace-subpanel">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Terminology expansion</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{results.terminology_expansion}</p>
                </div>
                <div className="workspace-subpanel lg:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Search strategy</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{results.search_strategy}</p>
                </div>
                <div className={`rounded-[28px] border px-5 py-5 lg:col-span-2 ${tone.emphasis}`}>
                  <h4 className={`text-lg font-semibold ${tone.emphasisTitle}`}>Enhanced search terms</h4>
                  <div className="mt-4 rounded-[22px] bg-white/80 px-4 py-4 font-mono text-sm text-slate-700">
                    {results.enhanced_search_terms}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedFeature.id === 'protocol-analysis' && results.agent_analyses ? (
              <>
                {renderAnalysisCards(results.agent_analyses, tone)}
                <div className={`rounded-[28px] border px-5 py-5 ${tone.emphasis}`}>
                  <h4 className={`text-lg font-semibold ${tone.emphasisTitle}`}>Executive summary</h4>
                  <div className="mt-4">
                    {renderRichContent(
                      getResultHtml(results, 'executive_summary_html', 'executive_summary', 'executive_summary_raw'),
                      getResultText(results, 'executive_summary_text', 'executive_summary_html', 'executive_summary', 'executive_summary_raw')
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {selectedFeature.id === 'trial-comparison' && results.comparisons ? (
              <>
                <div className="space-y-4">
                  {Object.entries(results.comparisons).map(([key, sectionHtml]: [string, any], index: number) => (
                    <div key={index} className="workspace-subpanel">
                      <h4 className="text-base font-semibold capitalize text-slate-950">{key.replace(/_/g, ' ')}</h4>
                      <div className="mt-4">
                        {renderRichContent(sectionHtml, stripHtml(sectionHtml as string))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`rounded-[28px] border px-5 py-5 ${tone.emphasis}`}>
                  <h4 className={`text-lg font-semibold ${tone.emphasisTitle}`}>Strategic synthesis</h4>
                  <div className="mt-4">{renderRichContent(results.strategic_synthesis, stripHtml(results.strategic_synthesis))}</div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
    );
  };

  const selectedFeatureTone = selectedFeature ? FEATURE_TONES[selectedFeature.tone] : FEATURE_TONES.sky;
  const SelectedFeatureIcon = selectedFeature?.icon;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="workspace-subpanel">
          <div className="workspace-kicker workspace-kicker-light">
            <BotIcon className="h-4 w-4" />
            Agent workflows
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Use deeper analysis only when the question needs it.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            These workflows are for heavier reasoning: amendment risk, design synthesis, schedule building, and trial
            comparison.
          </p>
        </div>

        <div className="workspace-subpanel">
          <div className="workspace-label">
            <SparklesIcon className="h-4 w-4 text-sky-600" />
            Workspace fit
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{AGENT_FEATURES.length}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Start in discovery, then move into one of these workflows when you need more structured reasoning.
          </p>
        </div>
      </section>

      {!selectedFeature ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {AGENT_FEATURES.map((feature) => {
            const tone = FEATURE_TONES[feature.tone];
            const FeatureIcon = feature.icon;

            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => handleFeatureClick(feature)}
                className="workspace-subpanel group text-left transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_24px_60px_rgba(14,165,233,0.10)]"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${tone.iconSurface} ${tone.iconColor}`}>
                  <FeatureIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                    {feature.inputs.length} input{feature.inputs.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">Open workflow</span>
                </div>
              </button>
            );
          })}
        </section>
      ) : (
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setSelectedFeature(null);
              setFormData({});
              setResults(null);
              setError(null);
            }}
            className="workspace-button-ghost"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to workflows
          </button>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="workspace-panel-light overflow-hidden">
              <div className="border-b border-slate-200/80 px-5 py-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${selectedFeatureTone.iconSurface} ${selectedFeatureTone.iconColor}`}
                  >
                    {SelectedFeatureIcon ? <SelectedFeatureIcon className="h-5 w-5" /> : null}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">{selectedFeature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedFeature.description}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {selectedFeature.inputs.map((input) => (
                    <div key={input.name} className="workspace-field">
                      <label className="workspace-label" htmlFor={`agent-${input.name}`}>
                        {input.name === 'nctIds' || input.name === 'nctId' ? (
                          <FlaskIcon className="h-4 w-4 text-sky-600" />
                        ) : (
                          <SearchIcon className="h-4 w-4 text-sky-600" />
                        )}
                        {input.label}
                      </label>
                      {input.type === 'select' ? (
                        <select
                          id={`agent-${input.name}`}
                          value={formData[input.name] || ''}
                          onChange={(event) => handleInputChange(input.name, event.target.value)}
                          required={input.required}
                          className="workspace-input"
                        >
                          <option value="">Select {input.label.toLowerCase()}</option>
                          {(input.options || []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`agent-${input.name}`}
                          type="text"
                          value={formData[input.name] || ''}
                          onChange={(event) => handleInputChange(input.name, event.target.value)}
                          placeholder={input.placeholder}
                          required={input.required}
                          className="workspace-input"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={loading}
                    className="workspace-button-primary min-w-[220px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? <ActivityIcon className="h-4 w-4 animate-pulse" /> : <SparklesIcon className="h-4 w-4" />}
                    {loading ? 'Running analysis' : 'Run analysis'}
                  </button>
                </form>

                {error ? (
                  <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <strong className="font-semibold">Error:</strong> {error}
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="workspace-subpanel">
              <div className="workspace-label">
                <SparklesIcon className="h-4 w-4 text-sky-600" />
                When to use this
              </div>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <p>Use agent workflows after discovery has already narrowed the relevant study set or question.</p>
                <p>Keep inputs focused. These workflows perform better with a precise NCT ID or a clean condition brief.</p>
                <p>Export results when you want to share analysis without bringing the whole workspace context along.</p>
              </div>
            </aside>
          </div>

          {renderResults()}
        </section>
      )}
    </div>
  );
}
