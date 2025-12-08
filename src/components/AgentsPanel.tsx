'use client';

import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5033';
const AGENTIC_API_BASE_URL = process.env.NEXT_PUBLIC_AGENTIC_API_BASE_URL || API_BASE_URL;

interface AgentFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  endpoint: string;
  inputs: Array<{
    name: string;
    label: string;
    type: 'text' | 'select';
    placeholder?: string;
    options?: string[];
    required?: boolean;
  }>;
}

const AGENT_FEATURES: AgentFeature[] = [
  {
    id: 'amendment-risk',
    title: '⚠️ Amendment Risk Predictor',
    description: 'Predict likelihood of protocol amendments based on design complexity using 4 specialized agents',
    icon: '⚠️',
    endpoint: '/api/amendment-risk',
    inputs: [
      { name: 'nctId', label: 'NCT ID', type: 'text', placeholder: 'e.g., NCT04831775', required: true }
    ]
  },
  {
    id: 'design-patterns',
    title: '🔍 Design Pattern Discovery',
    description: 'Discover design patterns across similar trials analyzed by 3 specialized agents',
    icon: '🔍',
    endpoint: '/api/design-patterns',
    inputs: [
      { name: 'condition', label: 'Condition', type: 'text', placeholder: 'e.g., Diabetes', required: true },
      { name: 'phase', label: 'Phase (Optional)', type: 'text', placeholder: 'e.g., Phase 3' },
      { name: 'interventionType', label: 'Intervention Type (Optional)', type: 'text', placeholder: 'e.g., Drug' }
    ]
  },
  {
    id: 'soa-composer',
    title: '📋 Schedule of Assessments Composer',
    description: 'Generate comprehensive Schedule of Assessments with 4 specialized agents',
    icon: '📋',
    endpoint: '/api/soa-composer',
    inputs: [
      { name: 'condition', label: 'Condition', type: 'text', placeholder: 'e.g., Diabetes', required: true },
      { name: 'phase', label: 'Phase (Optional)', type: 'text', placeholder: 'e.g., Phase 3' },
      { name: 'interventionType', label: 'Intervention Type (Optional)', type: 'text', placeholder: 'e.g., Drug' }
    ]
  },
  {
    id: 'agentic-search',
    title: '🚀 Agentic Search Enhancement',
    description: 'Enhanced search using multiple AI agents for terminology expansion',
    icon: '🚀',
    endpoint: '/api/agentic-search',
    inputs: [
      { name: 'query', label: 'Search Query', type: 'text', placeholder: 'e.g., Heart failure treatment', required: true }
    ]
  },
  {
    id: 'protocol-analysis',
    title: '🤖 Multi-Agent Protocol Analysis',
    description: 'Comprehensive protocol analysis with 5 specialized agents',
    icon: '🤖',
    endpoint: '/api/multi-agent-analysis',
    inputs: [
      { name: 'nctId', label: 'NCT ID', type: 'text', placeholder: 'e.g., NCT04831775', required: true }
    ]
  },
  {
    id: 'trial-comparison',
    title: '🔬 Multi-Agent Trial Comparison',
    description: 'Compare multiple trials across 4 key dimensions',
    icon: '🔬',
    endpoint: '/api/compare-trials',
    inputs: [
      { name: 'nctIds', label: 'NCT IDs (comma-separated)', type: 'text', placeholder: 'e.g., NCT04831775, NCT04838392', required: true }
    ]
  }
];

const AGENTIC_FEATURE_IDS = new Set([
  'amendment-risk',
  'design-patterns',
  'soa-composer',
  'agentic-search',
  'protocol-analysis',
  'trial-comparison',
]);

export default function AgentsPanel() {
  const [selectedFeature, setSelectedFeature] = useState<AgentFeature | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'plain'>('rendered');

  const handleFeatureClick = (feature: AgentFeature) => {
    setSelectedFeature(feature);
    setFormData({});
    setResults(null);
    setError(null);
    setViewMode('rendered');
  };

  const stripHtml = (html: string): string => {
    if (!html) return '';

    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      // Server-side fallback
      return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
    }

    try {
      // Create a temporary element
      const tmp = document.createElement('div');
      tmp.innerHTML = html;

      // Handle line breaks and paragraphs
      const paragraphs = tmp.querySelectorAll('p, div, br, h1, h2, h3, h4, h5, h6, li');
      paragraphs.forEach(el => {
        if (el.tagName === 'BR') {
          el.replaceWith('\n');
        } else {
          const textNode = document.createTextNode('\n\n');
          el.after(textNode);
        }
      });

      // Get the text content
      let text = tmp.textContent || tmp.innerText || '';

      // Clean up whitespace
      text = text
        .replace(/\n{3,}/g, '\n\n')        // Max 2 consecutive newlines
        .replace(/[ \t]{2,}/g, ' ')         // Remove multiple spaces
        .replace(/^\s+|\s+$/gm, '')         // Trim each line
        .trim();

      return text;
    } catch (error) {
      console.error('stripHtml error:', error);

      // Comprehensive fallback
      let text = html
        // Replace common block elements with newlines
        .replace(/<\/?(p|div|br|h[1-6]|li|ul|ol)[^>]*>/gi, '\n')
        // Remove all other HTML tags
        .replace(/<[^>]+>/g, '')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        // Clean up whitespace
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      return text;
    }
  };

  const getAnalysisHtml = (analysis: any) =>
    analysis?.content_html ?? analysis?.content ?? analysis?.content_raw ?? '';

  const getAnalysisText = (analysis: any) =>
    analysis?.content_text ?? stripHtml(getAnalysisHtml(analysis));

  const getResultHtml = (result: any, htmlKey: string, legacyKey: string, rawKey?: string) =>
    result?.[htmlKey] ?? result?.[legacyKey] ?? (rawKey ? result?.[rawKey] : '') ?? '';

  const getResultText = (result: any, textKey: string, htmlKey: string, legacyKey: string, rawKey?: string) =>
    result?.[textKey] ?? stripHtml(getResultHtml(result, htmlKey, legacyKey, rawKey));

  const generatePDF = async () => {
    if (!results || !selectedFeature) return;

    try {
      // Create a printable version
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

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
              color: #333;
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            h1 { color: #1565c0; border-bottom: 3px solid #1565c0; padding-bottom: 10px; }
            h2 { color: #0d47a1; margin-top: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }
            h3 { color: #546e7a; margin-top: 20px; }
            h4 { color: #37474f; margin-top: 15px; }
            .metadata { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
            .section { margin-bottom: 30px; padding: 20px; background: #fafafa; border-radius: 8px; }
            .highlight { background: #fff3e0; padding: 20px; border-left: 4px solid #ff9800; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
            th { background: #f5f5f5; font-weight: 600; }
            ul, ol { margin: 10px 0; padding-left: 30px; }
            li { margin: 8px 0; }
            strong { color: #0d47a1; }
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

      // Add content based on feature type
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
              <p><strong>Focus Areas:</strong> ${analysis.focus_areas.join(', ')}</p>
              ${analysis.content}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Executive Risk Assessment</h2>
            ${results.risk_assessment}
          </div>
        `;
      } else if (selectedFeature.id === 'design-patterns' && results.agent_analyses) {
        results.agent_analyses.forEach((analysis: any) => {
          htmlContent += `
            <div class="section">
              <h2>${analysis.agent}</h2>
              ${analysis.content}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Strategic Insights</h2>
            ${results.strategic_insights}
          </div>
        `;
      } else if (selectedFeature.id === 'soa-composer' && results.agent_analyses) {
        results.agent_analyses.forEach((analysis: any) => {
          htmlContent += `
            <div class="section">
              <h2>${analysis.agent}</h2>
              ${analysis.content}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Complete Schedule of Assessments</h2>
            ${results.complete_soa}
          </div>
        `;
      } else if (selectedFeature.id === 'protocol-analysis' && results.agent_analyses) {
        results.agent_analyses.forEach((analysis: any) => {
          htmlContent += `
            <div class="section">
              <h2>${analysis.agent}</h2>
              ${analysis.content}
            </div>
          `;
        });
        htmlContent += `
          <div class="highlight">
            <h2>Executive Summary</h2>
            ${results.executive_summary}
          </div>
        `;
      } else if (selectedFeature.id === 'trial-comparison' && results.comparisons) {
        Object.entries(results.comparisons).forEach(([key, content]: [string, any]) => {
          htmlContent += `
            <div class="section">
              <h2>${key.replace(/_/g, ' ').toUpperCase()}</h2>
              ${content}
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

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const downloadResults = () => {
    if (!results || !selectedFeature) return;

    let content = `${selectedFeature.title}\n`;
    content += `${'='.repeat(selectedFeature.title.length)}\n\n`;
    content += `Analysis Results\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Convert results to plain text
    if (selectedFeature.id === 'amendment-risk' && results.agent_analyses) {
      content += `Trial: ${results.trial?.nct_id} - ${results.trial?.title}\n\n`;
      results.agent_analyses.forEach((analysis: any) => {
        content += `${analysis.agent}\n${'-'.repeat(analysis.agent.length)}\n`;
        content += `Focus Areas: ${analysis.focus_areas.join(', ')}\n\n`;
        content += stripHtml(analysis.content) + '\n\n';
      });
      content += `EXECUTIVE RISK ASSESSMENT\n${'='.repeat(25)}\n`;
      content += stripHtml(results.risk_assessment) + '\n\n';
    } else if (selectedFeature.id === 'design-patterns' && results.agent_analyses) {
      results.agent_analyses.forEach((analysis: any) => {
        content += `${analysis.agent}\n${'-'.repeat(analysis.agent.length)}\n`;
        content += stripHtml(analysis.content) + '\n\n';
      });
      content += `STRATEGIC INSIGHTS\n${'='.repeat(18)}\n`;
      content += stripHtml(results.strategic_insights) + '\n\n';
    } else if (selectedFeature.id === 'soa-composer' && results.agent_analyses) {
      results.agent_analyses.forEach((analysis: any) => {
        content += `${analysis.agent}\n${'-'.repeat(analysis.agent.length)}\n`;
        content += stripHtml(analysis.content) + '\n\n';
      });
      content += `COMPLETE SCHEDULE OF ASSESSMENTS\n${'='.repeat(33)}\n`;
      content += stripHtml(results.complete_soa) + '\n\n';
    } else if (selectedFeature.id === 'agentic-search') {
      content += `Original Query: ${results.original_query}\n\n`;
      content += `Terminology Expansion:\n${results.terminology_expansion}\n\n`;
      content += `Search Strategy:\n${results.search_strategy}\n\n`;
      content += `Enhanced Search Terms:\n${results.enhanced_search_terms}\n`;
    } else if (selectedFeature.id === 'protocol-analysis' && results.agent_analyses) {
      results.agent_analyses.forEach((analysis: any) => {
        content += `${analysis.agent}\n${'-'.repeat(analysis.agent.length)}\n`;
        content += stripHtml(analysis.content) + '\n\n';
      });
      content += `EXECUTIVE SUMMARY\n${'='.repeat(17)}\n`;
      content += stripHtml(results.executive_summary) + '\n\n';
    } else if (selectedFeature.id === 'trial-comparison' && results.comparisons) {
      Object.entries(results.comparisons).forEach(([key, content]: [string, any]) => {
        const title = key.replace(/_/g, ' ').toUpperCase();
        content += `${title}\n${'-'.repeat(title.length)}\n`;
        content += stripHtml(content as string) + '\n\n';
      });
      content += `STRATEGIC SYNTHESIS\n${'='.repeat(19)}\n`;
      content += stripHtml(results.strategic_synthesis) + '\n\n';
    }

    // Create download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFeature.id}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Prepare request data based on feature
      let requestData: any = { ...formData };

      // Special handling for trial comparison (split comma-separated NCT IDs)
      if (selectedFeature?.id === 'trial-comparison' && formData.nctIds) {
        requestData = {
          nctIds: formData.nctIds.split(',').map(id => id.trim()).filter(id => id)
        };
      }

      const baseUrl = selectedFeature && AGENTIC_FEATURE_IDS.has(selectedFeature.id)
        ? AGENTIC_API_BASE_URL
        : API_BASE_URL;

      const response = await axios.post(`${baseUrl}${selectedFeature?.endpoint}`, requestData);
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="mt-6">
        {/* Controls Bar */}
        <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('rendered')}
              className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                viewMode === 'rendered'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              📊 Formatted View
            </button>
            <button
              onClick={() => setViewMode('plain')}
              className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                viewMode === 'plain'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              📝 Plain Text
            </button>
          </div>
          <button
            onClick={generatePDF}
            className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            📄 Download PDF
          </button>
        </div>

        {/* Results Container with max-width */}
        <div className="max-w-[90%] mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Results</h3>

        {/* Amendment Risk Results */}
        {selectedFeature?.id === 'amendment-risk' && results.agent_analyses && (
          <div>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-bold text-lg mb-2">Trial: {results.trial?.nct_id}</h4>
              <p className="text-gray-700">{results.trial?.title}</p>
            </div>

            {results.agent_analyses.map((analysis: any, idx: number) => (
              <div key={idx} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-lg mb-2 text-blue-600">{analysis.agent}</h4>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Focus Areas:</strong> {analysis.focus_areas.join(', ')}
                </div>
                {viewMode === 'rendered' ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: getAnalysisHtml(analysis) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                    {getAnalysisText(analysis)}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-2 border-red-200">
              <h4 className="font-bold text-xl mb-4 text-red-700">Executive Risk Assessment</h4>
              {viewMode === 'rendered' ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: getResultHtml(results, 'risk_assessment_html', 'risk_assessment', 'risk_assessment_raw'),
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                  {getResultText(results, 'risk_assessment_text', 'risk_assessment_html', 'risk_assessment', 'risk_assessment_raw')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Design Patterns Results */}
        {selectedFeature?.id === 'design-patterns' && results.agent_analyses && (
          <div>
            {results.agent_analyses.map((analysis: any, idx: number) => (
              <div key={idx} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-lg mb-2 text-purple-600">{analysis.agent}</h4>
                {viewMode === 'rendered' ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: getAnalysisHtml(analysis) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                    {getAnalysisText(analysis)}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
              <h4 className="font-bold text-xl mb-4 text-purple-700">Strategic Insights</h4>
              {viewMode === 'rendered' ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: getResultHtml(results, 'strategic_insights_html', 'strategic_insights', 'strategic_insights_raw'),
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                  {getResultText(results, 'strategic_insights_text', 'strategic_insights_html', 'strategic_insights', 'strategic_insights_raw')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SoA Composer Results */}
        {selectedFeature?.id === 'soa-composer' && results.agent_analyses && (
          <div>
            {results.agent_analyses.map((analysis: any, idx: number) => (
              <div key={idx} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-lg mb-2 text-green-600">{analysis.agent}</h4>
                {viewMode === 'rendered' ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: getAnalysisHtml(analysis) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                    {getAnalysisText(analysis)}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border-2 border-green-200">
              <h4 className="font-bold text-xl mb-4 text-green-700">Complete Schedule of Assessments</h4>
              {viewMode === 'rendered' ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: getResultHtml(results, 'complete_soa_html', 'complete_soa', 'complete_soa_raw'),
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                  {getResultText(results, 'complete_soa_text', 'complete_soa_html', 'complete_soa', 'complete_soa_raw')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agentic Search Results */}
        {selectedFeature?.id === 'agentic-search' && results.terminology_expansion && (
          <div>
            <div className="mb-4">
              <strong className="text-gray-700">Original Query:</strong>
              <span className="ml-2 text-gray-900">{results.original_query}</span>
            </div>
            <div className="mb-4">
              <strong className="text-gray-700">Terminology Expansion:</strong>
              <div className="mt-2 text-gray-900">{results.terminology_expansion}</div>
            </div>
            <div className="mb-4">
              <strong className="text-gray-700">Search Strategy:</strong>
              <div className="mt-2 text-gray-900">{results.search_strategy}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <strong className="text-gray-700">Enhanced Search Terms:</strong>
              <div className="mt-2 text-blue-900 font-mono text-sm">{results.enhanced_search_terms}</div>
            </div>
          </div>
        )}

        {/* Protocol Analysis Results */}
        {selectedFeature?.id === 'protocol-analysis' && results.agent_analyses && (
          <div>
            {results.agent_analyses.map((analysis: any, idx: number) => (
              <div key={idx} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-lg mb-2 text-indigo-600">{analysis.agent}</h4>
                {viewMode === 'rendered' ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: getAnalysisHtml(analysis) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                    {getAnalysisText(analysis)}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200">
              <h4 className="font-bold text-xl mb-4 text-indigo-700">Executive Summary</h4>
              {viewMode === 'rendered' ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: getResultHtml(results, 'executive_summary_html', 'executive_summary', 'executive_summary_raw'),
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                  {getResultText(results, 'executive_summary_text', 'executive_summary_html', 'executive_summary', 'executive_summary_raw')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trial Comparison Results */}
        {selectedFeature?.id === 'trial-comparison' && results.comparisons && (
          <div>
            {Object.entries(results.comparisons).map(([key, content]: [string, any], idx: number) => (
              <div key={idx} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-lg mb-2 text-teal-600 capitalize">{key.replace(/_/g, ' ')}</h4>
                {viewMode === 'rendered' ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                    {stripHtml(content as string)}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-6 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-2 border-teal-200">
              <h4 className="font-bold text-xl mb-4 text-teal-700">Strategic Synthesis</h4>
              {viewMode === 'rendered' ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: results.strategic_synthesis }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-base text-gray-800 leading-relaxed">
                  {stripHtml(results.strategic_synthesis)}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Agents</h2>
        <p className="text-gray-600">Powered by GPT-4o and specialized multi-agent systems</p>
      </div>

      {!selectedFeature ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENT_FEATURES.map((feature) => (
            <div
              key={feature.id}
              onClick={() => handleFeatureClick(feature)}
              className="p-6 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => {
              setSelectedFeature(null);
              setFormData({});
              setResults(null);
              setError(null);
            }}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Features
          </button>

          <div className="p-6 bg-white border-2 border-gray-200 rounded-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{selectedFeature.title}</h3>
            <p className="text-gray-600 mb-6">{selectedFeature.description}</p>

            <form onSubmit={handleSubmit}>
              {selectedFeature.inputs.map((input) => (
                <div key={input.name} className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {input.label}
                    {input.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type={input.type}
                    value={formData[input.name] || ''}
                    onChange={(e) => handleInputChange(input.name, e.target.value)}
                    placeholder={input.placeholder}
                    required={input.required}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}

            {renderResults()}
          </div>
        </div>
      )}
    </div>
  );
}
