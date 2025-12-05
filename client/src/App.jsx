import { useState, useRef } from "react";
import PDFViewerWithHighlights from "./components/pdf-viewer";
import ClauseLegend from "./components/clause-legend";
import CategoryViewer from "./components/category-viewer";
import {
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap
} from "lucide-react";

export default function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingClause, setIsGeneratingClause] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const [uploadedPdfPath, setUploadedPdfPath] = useState("");
  const [predictedClauses, setPredictedClauses] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  // Summarization State
  const [summaryJobId, setSummaryJobId] = useState(null);
  const [expandedSummaryRows, setExpandedSummaryRows] = useState({});

  // On-demand clause summarization state
  const [selectedClauseIndex, setSelectedClauseIndex] = useState("");
  const [activeClauseSummary, setActiveClauseSummary] = useState(null);


  const handleFileSelect = (selectedFile) => {
    if (
      selectedFile &&
      (selectedFile.type === "application/pdf" ||
        selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      if (selectedFile.size <= 10 * 1024 * 1024) {
        // 10MB limit
        setFile(selectedFile);
        setUploadComplete(false);
        setPredictedClauses(null);
        setSummaryResult(null);
        setSummaryJobId(null);
        setExpandedSummaryRows({});
        setSelectedClauseIndex("");
        setActiveClauseSummary(null);
      } else {
        alert("File size must be less than 10MB");
      }
    } else {
      alert("Please select a PDF or DOCX file");
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const path =
        result?.pdf_path ||
        result?.file_path ||
        result?.path ||
        result?.saved_path ||
        "";
      setUploadedPdfPath(path);

      setUploadComplete(true);
      console.log("Upload result:", result);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedPdfPath && !file) {
      alert("Please upload the file first.");
      return;
    }

    // Fallback if upload hasn't finished but file is selected
    const pdfPath = uploadedPdfPath || `../client/uploads/${file.name}`;

    setIsAnalyzing(true);
    setError(null);
    setPredictedClauses(null);

    try {
      const response = await fetch("http://localhost:8000/predict-clauses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdf_path: pdfPath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Expecting { predicted_clauses: [{ clause_no, category, clause }, ...] }
      setPredictedClauses(result?.predicted_clauses || []);
      console.log("Predicted clauses:", result);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- SUMMARIZATION LOGIC ---
  const handleSummarize = async () => {
    if (!uploadedPdfPath) {
      alert("Please upload the file first.");
      return;
    }

    setIsSummarizing(true);
    setSummaryResult(null);
    setError(null);

    try {
      // 1. Start Job
      const response = await fetch("http://localhost:8000/summaries/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_path: uploadedPdfPath }),
      });

      if (!response.ok) throw new Error("Failed to start summarization");

      const data = await response.json();
      setSummaryJobId(data.job_id);

      // 2. Poll Status
      pollSummarizationStatus(data.job_id);

    } catch (err) {
      setError(`Summarization start failed: ${err.message}`);
      setIsSummarizing(false);
    }
  };

  const pollSummarizationStatus = async (jobId) => {
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/summaries/${jobId}`);
        if (!res.ok) throw new Error("Polling failed");

        const data = await res.json();

        if (data.status === "COMPLETED" || data.status === "PARTIAL_FAILURE") {
          setSummaryResult(data);
          setIsSummarizing(false);
          clearInterval(intervalId);
        } else if (data.status === "FAILED") {
          setError(`Summarization failed: ${data.error || "Unknown error"}`);
          setIsSummarizing(false);
          clearInterval(intervalId);
        }
        // If PENDING/PROCESSING, continue polling...
      } catch (err) {
        console.error("Polling error", err);
        setIsSummarizing(false);
        clearInterval(intervalId);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleClauseSelection = async (e) => {
    const idx = e.target.value;
    setSelectedClauseIndex(idx);

    if (idx === "" || !predictedClauses) {
      setActiveClauseSummary(null);
      return;
    }

    const clauseIndex = parseInt(idx);
    const clause = predictedClauses[clauseIndex];

    if (!clause) {
      setActiveClauseSummary(null);
      return;
    }

    // If no summaryJobId exists, we need to create one first for RAG context
    let jobId = summaryJobId;
    if (!jobId && uploadedPdfPath) {
      try {
        // Create a minimal job for RAG indexing
        const jobRes = await fetch("http://localhost:8000/summaries/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf_path: uploadedPdfPath }),
        });
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          jobId = jobData.job_id;
          setSummaryJobId(jobId);
          // Wait a bit for RAG indexing to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        console.error("Failed to create job for clause summary:", err);
      }
    }

    setIsGeneratingClause(true);
    setActiveClauseSummary(null);
    setError(null);

    // Get context (previous and next clauses)
    const prev = clauseIndex > 0 ? predictedClauses[clauseIndex - 1].clause : "";
    const next = clauseIndex < predictedClauses.length - 1 ? predictedClauses[clauseIndex + 1].clause : "";

    try {
      const res = await fetch("http://localhost:8000/summaries/clause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId || "temp",
          text: clause.clause,
          clause_no: clause.clause_no || clauseIndex + 1,
          prev_text: prev,
          next_text: next
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setActiveClauseSummary(data.summary);
    } catch (err) {
      setError(`Clause summarization failed: ${err.message}`);
      console.error(err);
    }
    finally {
      setIsGeneratingClause(false);
    }
  };

  const toggleSummaryRow = (index) => {
    setExpandedSummaryRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderClauseSummarizationSection = () => {
    if (!predictedClauses || predictedClauses.length === 0) return null;

    return (
      <div className="mt-8 bg-white rounded-xl border border-purple-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="text-purple-600" />
          <h4 className="text-xl font-bold text-neutral-800">On-Demand Clause Summarization</h4>
        </div>

        <label className="block text-sm font-medium mb-2 text-neutral-600">
          Select a clause to generate instant AI summary:
        </label>
        <select
          className="w-full p-3 border-2 border-purple-400 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none cursor-pointer transition-colors appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
          onChange={handleClauseSelection}
          value={selectedClauseIndex}
          disabled={!uploadedPdfPath}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: '2.5rem'
          }}
        >
          <option value="" className="bg-white text-neutral-900">-- Select a Clause --</option>
          {predictedClauses.map((c, idx) => (
            <option key={idx} value={idx} className="bg-white text-neutral-900">
              Clause {c.clause_no || idx + 1}: {c.category} ({c.clause.substring(0, 40)}...)
            </option>
          ))}
        </select>

        {isGeneratingClause && (
          <div className="flex items-center gap-2 text-purple-600 text-sm animate-pulse mb-4 mt-4">
            <Loader2 className="animate-spin" size={16} /> Generating AI analysis...
          </div>
        )}

        {activeClauseSummary && (
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mt-4 animate-in fade-in">
            <h4 className="text-xs font-bold text-purple-800 uppercase mb-2">AI Interpretation</h4>
            <p className="text-sm text-neutral-800 leading-relaxed">{activeClauseSummary}</p>
          </div>
        )}

        {selectedClauseIndex !== "" && !isGeneratingClause && !activeClauseSummary && (
          <div className="text-sm text-neutral-500 italic mt-4">
            No summary available for selected clause.
          </div>
        )}
      </div>
    );
  };

  const renderSummarizationSection = () => {
    if (!summaryResult) return null;

    const { document_summary, clause_summaries, model_version } = summaryResult;

    return (
      <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            AI Summary Report
          </h4>
          <span className="text-xs text-neutral-400 font-mono">Model: {model_version}</span>
        </div>

        {/* Executive Summary Card */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-6 shadow-sm">
          <h5 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-3">Executive Summary</h5>
          <div className="prose prose-sm max-w-none text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {document_summary || "Document summary unavailable."}
          </div>
        </div>

        {/* Clause Summaries Table (if any exist from batch processing) */}
        {clause_summaries && clause_summaries.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h5 className="font-semibold text-neutral-700">Clause Breakdown</h5>
              <span className="text-xs text-neutral-500">{clause_summaries.length} clauses processed</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="px-6 py-3 text-left w-16">#</th>
                    <th className="px-6 py-3 text-left w-1/4">Category</th>
                    <th className="px-6 py-3 text-left">Summary</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {clause_summaries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-neutral-400">{item.clause_no}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <p className="text-neutral-800 font-medium leading-relaxed">
                            {item.summary_text}
                          </p>
                          {/* Expandable Original Text */}
                          <button
                            onClick={() => toggleSummaryRow(idx)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                          >
                            {expandedSummaryRows[idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {expandedSummaryRows[idx] ? "Hide Original Text" : "Show Original Text"}
                          </button>
                          {expandedSummaryRows[idx] && (
                            <div className="mt-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 italic">
                              "{item.original_text}"
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.is_failed ? (
                          <span className="text-red-500 flex items-center justify-end gap-1 text-xs"><AlertTriangle size={14} /> Failed</span>
                        ) : (
                          <span className="text-emerald-500 flex items-center justify-end gap-1 text-xs"><CheckCircle size={14} /> Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalysisTable = () => {
    if (!predictedClauses) return null;

    const isPDF = file && file.type === "application/pdf";

    const filteredClauses = predictedClauses
      ? predictedClauses.filter((item) => {
        const keyword = searchKeyword.toLowerCase();
        const clauseText = (item?.clause || "").toLowerCase();
        const categoryText = (item?.category || "").toLowerCase();
        return clauseText.includes(keyword) || categoryText.includes(keyword);
      })
      : [];

    return (
      <div className="mt-8 bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Clause Extraction Results
          </h4>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search clauses..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-neutral-200 mb-6">
          <div className="overflow-x-auto max-h-[400px]">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium border-b">Text Snippet</th>
                  <th className="px-4 py-3 text-left font-medium border-b">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredClauses.map((item, index) => (
                  <tr key={`pred-${index}`} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-600 w-2/3">
                      {item.clause.length > 150 ? `${item.clause.substring(0, 150)}...` : item.clause}
                    </td>
                    <td className="px-4 py-3 w-1/3">
                      <CategoryViewer clause_no={item.clause_no} category={item.category} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isPDF && predictedClauses.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="border-t border-neutral-100 pt-6">
              <h5 className="font-medium text-neutral-900 mb-4">PDF Visualization</h5>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 border border-neutral-200 rounded-lg overflow-hidden h-[600px]">
                  <PDFViewerWithHighlights file={file} predictedClauses={predictedClauses} />
                </div>
                <div className="lg:col-span-1">
                  <ClauseLegend predictedClauses={predictedClauses} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <div className="container mx-auto px-4 pt-10 pb-20">

        {/* HEADER & UPLOAD SECTION */}
        <div className="max-w-4xl mx-auto p-8 bg-white rounded-2xl border border-neutral-200 shadow-sm mb-8">
          <div className="mb-8 text-center">
            <h3 className="text-3xl font-bold tracking-tight text-neutral-900">Tahqiiq Legal Analyzer</h3>
            <p className="text-neutral-500 mt-2">Upload a contract to identify clauses, analyze risks, and generate AI summaries.</p>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-xl p-10 text-center mb-6 cursor-pointer transition-all duration-200 group
              ${isDragOver ? "border-blue-500 bg-blue-50" : "border-neutral-300 hover:border-blue-400 hover:bg-neutral-50"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            <div className="w-16 h-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
              <FileText size={32} />
            </div>
            <p className="text-lg font-medium text-neutral-700 mb-1">
              Drag & Drop or <span className="text-blue-600 underline decoration-2 underline-offset-4">Browse</span>
            </p>
            <p className="text-sm text-neutral-400">PDF or DOCX, max 10MB</p>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileInputChange} />
          </div>

          {file && (
            <div className="flex items-center justify-center gap-2 mb-6 text-emerald-600 bg-emerald-50 py-2 rounded-lg border border-emerald-100">
              <CheckCircle size={16} />
              <span className="font-medium text-sm">{file.name} ready for processing</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <button
              className="inline-flex items-center justify-center bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg py-3 px-4 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={handleUpload}
              disabled={isUploading || !file || uploadComplete}
            >
              {isUploading ? "Uploading..." : uploadComplete ? "Uploaded" : "1. Upload"}
            </button>

            <button
              className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 px-4 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !uploadComplete}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Analyzing...</span>
              ) : "2. Analyze Clauses"}
            </button>

            <button
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-4 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={handleSummarize}
              disabled={isSummarizing || !uploadComplete}
            >
              {isSummarizing ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Summarizing...</span>
              ) : "3. General Summary"}
            </button>

            {/* On-Demand Clause Summary Dropdown */}
            {predictedClauses && predictedClauses.length > 0 && (
              <div className="sm:col-span-1 relative">
                <select
                  className="w-full p-3 border-2 border-purple-400 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none cursor-pointer transition-colors appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  onChange={handleClauseSelection}
                  value={selectedClauseIndex}
                  disabled={!uploadedPdfPath}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="" className="bg-white text-neutral-900">4. Summarize Clause</option>
                  {predictedClauses.map((c, idx) => (
                    <option key={idx} value={idx} className="bg-white text-neutral-900">
                      Clause {c.clause_no || idx + 1}: {c.category}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* RESULTS AREA */}
        <div className="max-w-6xl mx-auto">
          {renderAnalysisTable()}
          {renderClauseSummarizationSection()}
          {renderSummarizationSection()}
        </div>
      </div>
    </div>
  );
}
