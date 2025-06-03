import React, { useState } from 'react';
import FileUploader, { UploadedFile } from '../components/FileUploader';
import { useDocuments, PolicyDocument } from '../contexts/DocumentContext';
import { aiService } from '../services/aiService';

const Policies: React.FC = () => {
  const [showUploader, setShowUploader] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PolicyDocument | null>(null);
  
  const { 
    documents, 
    addDocuments, 
    removeDocument
  } = useDocuments();

  const handleFilesUploaded = async (newFiles: UploadedFile[]) => {
    console.log('📄 Files uploaded:', newFiles.length);
    
    addDocuments(newFiles);
    setShowUploader(false);

    // Update AI service context
    const allDocumentNames = documents.map(d => d.name).concat(newFiles.map(f => f.name));
    aiService.updatePolicyContext(allDocumentNames);
  };

  const handleViewDetails = (doc: PolicyDocument) => {
    setSelectedDocument(doc);
  };

  const handleDownload = (doc: PolicyDocument) => {
    try {
      // Create a download link for the file
      if (doc.file) {
        const url = URL.createObjectURL(doc.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        console.warn('File not available for download:', doc.name);
        alert('Original file not available for download');
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleGenerateReport = (doc: PolicyDocument) => {
    try {
      // Generate a comprehensive report for the document
      const reportContent = generateReportContent(doc);
      
      // Create and download the report as a text file
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.name.replace(/\.[^/.]+$/, "")}_analysis_report.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Report generated successfully for:', doc.name);
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const generateReportContent = (doc: PolicyDocument): string => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    let report = `RISKNINJA POLICY ANALYSIS REPORT\n`;
    report += `Generated on: ${date} at ${time}\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    // Document Information
    report += `DOCUMENT INFORMATION\n`;
    report += `${'-'.repeat(20)}\n`;
    report += `File Name: ${doc.name}\n`;
    report += `File Size: ${(doc.size / (1024 * 1024)).toFixed(2)} MB\n`;
    report += `Upload Date: ${formatDate(doc.uploadedAt)}\n`;
    report += `Status: ${doc.status || 'Uploaded'}\n\n`;
    
    // Risk Assessment
    if (doc.riskScore) {
      report += `RISK ASSESSMENT\n`;
      report += `${'-'.repeat(15)}\n`;
      report += `Risk Score: ${doc.riskScore}/100\n`;
      report += `Risk Level: ${getRiskScoreLabel(doc.riskScore)}\n\n`;
    }
    
    // AI Insights
    if (doc.insights && doc.insights.length > 0) {
      report += `AI-GENERATED INSIGHTS\n`;
      report += `${'-'.repeat(21)}\n`;
      doc.insights.forEach((insight, index) => {
        report += `${index + 1}. ${insight}\n`;
      });
      report += `\n`;
    }
    
    // AI Recommendations
    if (doc.recommendations && doc.recommendations.length > 0) {
      report += `AI RECOMMENDATIONS\n`;
      report += `${'-'.repeat(18)}\n`;
      doc.recommendations.forEach((recommendation, index) => {
        report += `${index + 1}. ${recommendation}\n`;
      });
      report += `\n`;
    }
    
    // Policy Details
    if (doc.policyOption) {
      report += `POLICY INFORMATION\n`;
      report += `${'-'.repeat(18)}\n`;
      report += `Provider: ${doc.policyOption.provider}\n`;
      report += `Plan Name: ${doc.policyOption.planName}\n`;
      report += `Monthly Premium: $${doc.policyOption.monthlyPremium}\n`;
      report += `Annual Premium: $${doc.policyOption.annualPremium}\n`;
      report += `Deductible: $${doc.policyOption.deductible}\n`;
      report += `Coverage Limit: $${doc.policyOption.coverageLimit.toLocaleString()}\n\n`;
      
      if (doc.policyOption.features && doc.policyOption.features.length > 0) {
        report += `COVERAGE FEATURES\n`;
        report += `${'-'.repeat(16)}\n`;
        doc.policyOption.features.forEach((feature, index) => {
          report += `• ${feature}\n`;
        });
        report += `\n`;
      }
      
      if (doc.policyOption.pros && doc.policyOption.pros.length > 0) {
        report += `ADVANTAGES\n`;
        report += `${'-'.repeat(10)}\n`;
        doc.policyOption.pros.forEach((pro, index) => {
          report += `+ ${pro}\n`;
        });
        report += `\n`;
      }
      
      if (doc.policyOption.cons && doc.policyOption.cons.length > 0) {
        report += `CONSIDERATIONS\n`;
        report += `${'-'.repeat(13)}\n`;
        doc.policyOption.cons.forEach((con, index) => {
          report += `- ${con}\n`;
        });
        report += `\n`;
      }
    }
    
    report += `${'='.repeat(50)}\n`;
    report += `Report generated by RiskNinja AI\n`;
    report += `For more information, visit your RiskNinja dashboard.\n`;
    
    return report;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getRiskScoreLabel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <div className="px-40 flex flex-1 justify-center py-5 dark:bg-dark-bg transition-colors duration-200">
      <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <p className="text-[#0e161b] dark:text-dark-text tracking-light text-[32px] font-bold leading-tight min-w-72">
            Your Commercial Insurance Documents
          </p>
          <button
            onClick={() => setShowUploader(true)}
            className="bg-[#1993e5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1470b8] transition-colors flex items-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
            Upload Documents
          </button>
        </div>

        {/* Upload Modal */}
        {showUploader && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#0e161b] dark:text-dark-text">Upload Commercial Insurance Documents</h3>
                <button
                  onClick={() => setShowUploader(false)}
                  className="text-[#4e7a97] dark:text-dark-muted hover:text-[#0e161b] dark:hover:text-dark-text transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                  </svg>
                </button>
              </div>
              
              <FileUploader onFilesUploaded={handleFilesUploaded} />
            </div>
          </div>
        )}

        {/* Document Details Modal */}
        {selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#0e161b]">Document Details</h3>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-[#4e7a97] hover:text-[#0e161b] transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                  </svg>
                </button>
              </div>
              
              {/* Document Info */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-[#0e161b] mb-3">File Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#4e7a97]">Name:</span>
                    <span className="ml-2 font-medium text-[#0e161b]">{selectedDocument.name}</span>
                  </div>
                  <div>
                    <span className="text-[#4e7a97]">Size:</span>
                    <span className="ml-2 font-medium text-[#0e161b]">
                      {(selectedDocument.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4e7a97]">Type:</span>
                    <span className="ml-2 font-medium text-[#0e161b]">{selectedDocument.type}</span>
                  </div>
                  <div>
                    <span className="text-[#4e7a97]">Uploaded:</span>
                    <span className="ml-2 font-medium text-[#0e161b]">
                      {formatDate(selectedDocument.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              {selectedDocument.riskScore && (
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-[#0e161b] mb-3">Risk Assessment</h4>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#4e7a97]">Risk Score</span>
                        <span className={`text-sm font-bold ${getRiskScoreColor(selectedDocument.riskScore)}`}>
                          {selectedDocument.riskScore}/100
                        </span>
                      </div>
                      <div className="w-full bg-[#d0dee7] rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            selectedDocument.riskScore >= 80 ? 'bg-green-500' :
                            selectedDocument.riskScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${selectedDocument.riskScore}%` }}
                        />
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedDocument.riskScore >= 80 ? 'bg-green-100 text-green-800' :
                      selectedDocument.riskScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {getRiskScoreLabel(selectedDocument.riskScore)}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {selectedDocument.insights && selectedDocument.insights.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-[#0e161b] mb-3">AI-Generated Insights</h4>
                  <ul className="space-y-2">
                    {selectedDocument.insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-[#4e7a97]">
                        <div className="w-1.5 h-1.5 bg-[#1993e5] rounded-full mt-2 flex-shrink-0"></div>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Recommendations */}
              {selectedDocument.recommendations && selectedDocument.recommendations.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-[#0e161b] mb-3">AI Recommendations</h4>
                  <ul className="space-y-2">
                    {selectedDocument.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-[#4e7a97]">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Policy Details */}
              {selectedDocument.policyOption && (
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-[#0e161b] mb-3">Policy Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-[#4e7a97]">Provider:</span>
                      <span className="ml-2 font-medium text-[#0e161b]">
                        {selectedDocument.policyOption.provider}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#4e7a97]">Plan:</span>
                      <span className="ml-2 font-medium text-[#0e161b]">
                        {selectedDocument.policyOption.planName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#4e7a97]">Monthly Premium:</span>
                      <span className="ml-2 font-medium text-[#0e161b]">
                        ${selectedDocument.policyOption.monthlyPremium}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#4e7a97]">Deductible:</span>
                      <span className="ml-2 font-medium text-[#0e161b]">
                        ${selectedDocument.policyOption.deductible}
                      </span>
                    </div>
                  </div>
                  
                  {selectedDocument.policyOption.features && selectedDocument.policyOption.features.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-[#0e161b] mb-2">Coverage Features</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocument.policyOption.features.map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#d0dee7]">
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  className="px-4 py-2 bg-[#1993e5] text-white rounded-lg text-sm font-medium hover:bg-[#1470b8] transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                  </svg>
                  Download Original
                </button>
                <button
                  onClick={() => handleGenerateReport(selectedDocument)}
                  className="px-4 py-2 bg-[#1993e5] text-white rounded-lg text-sm font-medium hover:bg-[#1470b8] transition-colors"
                >
                  Generate Report
                </button>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="px-4 py-2 border border-[#d0dee7] text-[#0e161b] rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {documents.length === 0 ? (
          // Empty State
          <div className="px-4 py-8">
            <div className="bg-slate-50 dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-8 text-center">
              <div className="mx-auto w-16 h-16 text-[#4e7a97] dark:text-dark-muted mb-4">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <div className="text-[#4e7a97] dark:text-dark-muted text-lg font-medium mb-4">
                No documents uploaded yet
              </div>
              <p className="text-[#4e7a97] dark:text-dark-muted text-sm mb-6">
                Upload your commercial insurance policy documents to get started with AI-powered analysis and risk assessment.
              </p>
              <button
                onClick={() => setShowUploader(true)}
                className="bg-[#1993e5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1470b8] transition-colors"
              >
                Upload Your First Document
              </button>
            </div>
          </div>
        ) : (
          // Document List
          <div className="px-4 space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-[#0e161b] dark:text-dark-text truncate mb-2">
                      {doc.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-[#4e7a97] dark:text-dark-muted">
                      <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                      <span>•</span>
                      <span>{(doc.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span className={`font-medium ${getRiskScoreColor(doc.riskScore)}`}>
                        {getRiskScoreLabel(doc.riskScore)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4">
                    <button
                      onClick={() => handleViewDetails(doc)}
                      className="text-[#1993e5] hover:text-[#1470b8] text-sm font-medium transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="text-[#1993e5] hover:text-[#1470b8] text-sm font-medium transition-colors"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="text-[#4e7a97] hover:text-red-600 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Processing Status */}
                {doc.status === 'processing' && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-700"></div>
                      <span className="text-sm font-medium">Processing document with AI...</span>
                    </div>
                  </div>
                )}

                {/* Insights */}
                {doc.insights && doc.insights.length > 0 && doc.status === 'completed' && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#0e161b] mb-2">AI Insights</h4>
                    <ul className="space-y-1">
                      {doc.insights.map((insight, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-[#4e7a97]">
                          <div className="w-1.5 h-1.5 bg-[#1993e5] rounded-full"></div>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Recommendations */}
                {doc.recommendations && doc.recommendations.length > 0 && doc.status === 'completed' && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#0e161b] mb-2">AI Recommendations</h4>
                    <ul className="space-y-1">
                      {doc.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-[#4e7a97]">
                          <div className="w-1.5 h-1.5 bg-success rounded-full mt-1.5 flex-shrink-0"></div>
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Score */}
                {doc.riskScore && doc.status === 'completed' && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-[#0e161b]">Risk Assessment:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#d0dee7] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            doc.riskScore >= 80 ? 'bg-green-500' :
                            doc.riskScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${doc.riskScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getRiskScoreColor(doc.riskScore)}`}>
                        {doc.riskScore}/100
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {doc.status === 'completed' && (
                  <div className="mt-4 pt-4 border-t border-[#d0dee7] dark:border-dark-border flex gap-3">
                    <button 
                      onClick={() => handleGenerateReport(doc)}
                      className="px-4 py-2 bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border text-[#0e161b] dark:text-dark-text rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-dark-bg transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                      </svg>
                      Generate Report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Feature Cards */}
        <div className="px-4 mt-8">
          <h3 className="text-[#0e161b] text-lg font-bold mb-6">What RiskNinja Can Do</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#d0dee7] rounded-lg p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1993e5">
                  <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                </svg>
              </div>
              <h4 className="font-medium text-[#0e161b] mb-2">Smart Analysis</h4>
              <p className="text-[#4e7a97] text-sm">
                Extract key information from commercial policy documents using advanced OCR and AI analysis.
              </p>
            </div>

            <div className="bg-white border border-[#d0dee7] rounded-lg p-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M13,7.5L10.5,9.5L9.5,8.5L8,10L10.5,12.5L15,8M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" />
                </svg>
              </div>
              <h4 className="font-medium text-[#0e161b] mb-2">Business Risk Assessment</h4>
              <p className="text-[#4e7a97] text-sm">
                Get intelligent risk scores and recommendations based on your commercial policy coverage.
              </p>
            </div>

            <div className="bg-white border border-[#d0dee7] rounded-lg p-6">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b">
                  <path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" />
                </svg>
              </div>
              <h4 className="font-medium text-[#0e161b] mb-2">Commercial Policy Comparison</h4>
              <p className="text-[#4e7a97] text-sm">
                Compare multiple commercial policies side-by-side to find the best business coverage for your needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policies; 