import { useState, useRef } from "react";
import PDFViewerWithHighlights from "./components/pdf-viewer";
import ClauseLegend from "./components/clause-legend";
import CategoryViewer from "./components/category-viewer";

export default function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [analyzeNow, setAnalyzeNow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'pdf'
  const fileInputRef = useRef(null);

  const [uploadedPdfPath, setUploadedPdfPath] = useState("");
  const [predictedClauses, setPredictedClauses] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  const clauses = [
    "Document Name",
    "Parties",
    "Agreement Date",
    "Effective Date",
    "Expiration Date",
    "Renewal Term",
    "Notice to Terminate Renewal",
    "Governing Law",
    "Most Favored Nation",
    "Non-Compete",
    "Exclusivity",
    "No-Solicit of Customers",
    "Competitive Restriction Exception",
    "No-Solicit of Employees",
    "Non-Disparagement",
    "Termination for Convenience",
    "Right of First Refusal, Offer or Negotiation (ROFR/ROFO/ROFN)",
    "Change of Control",
    "Anti-Assignment",
    "Revenue/Profit Sharing",
    "Price Restriction",
    "Minimum Commitment",
    "Volume Restriction",
    "IP Ownership Assignment",
    "Joint IP Ownership",
    "License Grant",
    "Non-Transferable License",
    "Affiliate IP License-Licensor",
    "Affiliate IP License-Licensee",
    "Unlimited/All-You-Can-Eat License",
    "Irrevocable or Perpetual License",
    "Source Code Escrow",
    "Post-Termination Services",
    "Audit Rights",
    "Uncapped Liability",
    "Cap on Liability",
    "Liquidated Damages",
    "Warranty Duration",
    "Insurance",
    "Covenant not to Sue",
    "Third Party Beneficiary",
  ];

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
        setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, "")); // Remove file extension
        setUploadComplete(false);
        setProgress(0);
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
    if (!file) {
      alert("Please select a file first");
      return;
    }

    // Use server-returned path if available, otherwise fall back to a reasonable default
    const pdfPath = uploadedPdfPath || `../client/uploads/${documentName}.pdf`;

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
      setViewMode("table");
      console.log("Predicted clauses:", result);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderAnalysisTable = () => {
    if (!predictedClauses && !analysisResult) return null;

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
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Analysis Results</h4>
        </div>

        {predictedClauses && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search clauses by keyword..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 shadow-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <p className="text-sm text-neutral-600 mt-2">
              Showing {filteredClauses.length} of {predictedClauses.length}{" "}
              results
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-700 sticky top-0 z-10">
                <tr>
                  {predictedClauses ? (
                    <>
                      <th className="px-4 py-3 text-left font-medium border-b border-neutral-200">
                        Clause
                      </th>
                      <th className="px-4 py-3 text-left font-medium border-b border-neutral-200">
                        Category
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left font-medium border-b border-neutral-200">
                        Label
                      </th>
                      <th className="px-4 py-3 text-left font-medium border-b border-neutral-200">
                        Text
                      </th>
                      <th className="px-4 py-3 text-left font-medium border-b border-neutral-200">
                        Confidence
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {predictedClauses ? (
                  filteredClauses.length > 0 ? (
                    filteredClauses.map((item, index) => (
                      <tr
                        key={`pred-${index}`}
                        className="odd:bg-neutral-50/60 hover:bg-neutral-100/60 transition"
                      >
                        <td className="px-4 py-3 text-neutral-800 align-top">
                          <div className="max-w-3xl leading-relaxed">
                            {item?.clause?.length > 500
                              ? `${item.clause.substring(0, 500)}...`
                              : item?.clause || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium align-top">
                          <CategoryViewer
                            clause_no={item?.clause_no}
                            category={item?.category}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-4 py-8 text-center text-neutral-500"
                      >
                        No clauses match your search
                      </td>
                    </tr>
                  )
                ) : (
                  Object.entries(analysisResult).map(([label, items]) =>
                    items.map((item, index) => (
                      <tr
                        key={`${label}-${index}`}
                        className="odd:bg-neutral-50/60 hover:bg-neutral-100/60 transition"
                      >
                        <td className="px-4 py-3 font-medium text-blue-700 align-top">
                          {Number.parseInt(label.match(/\d+$/)[0], 10) >= 41
                            ? "O-label"
                            : clauses[
                                Number.parseInt(label.match(/\d+$/)[0], 10)
                              ]}
                        </td>
                        <td className="px-4 py-3 text-neutral-800 align-top">
                          <div className="max-w-2xl leading-relaxed">
                            {item.text.length > 200
                              ? `${item.text.substring(0, 200)}...`
                              : item.text}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold
                              ${
                                item.confidence > 0.7
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.confidence > 0.5
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                          >
                            {(item.confidence * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isPDF &&
          Array.isArray(predictedClauses) &&
          predictedClauses.length > 0 && (
            <div className="mt-6 space-y-4">
              <PDFViewerWithHighlights
                file={file}
                predictedClauses={predictedClauses}
              />
              <ClauseLegend predictedClauses={predictedClauses} />
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="container mx-auto px-4 pt-16 pb-12">
        <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold tracking-tight">
              Upload Legal Document
            </h3>
            <p className="text-sm text-neutral-600 mt-1">
              Upload a PDF or DOCX, then analyze clauses and view highlights in
              the PDF.
            </p>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center mb-5 cursor-pointer transition-all
              ${
                isDragOver
                  ? "border-blue-500 bg-blue-50/60"
                  : "border-neutral-300 hover:border-neutral-400 bg-neutral-50/40"
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            role="button"
            aria-label="Upload area. Click to browse files or drag and drop a document."
            tabIndex={0}
          >
            {/* decorative icon */}
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                className="text-neutral-700"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 16V4" />
                <path d="m6 10 6-6 6 6" />
                <rect x="4" y="16" width="16" height="4" rx="1" />
              </svg>
            </div>
            <p className="mb-1 text-neutral-700">
              {"Drag & Drop or "}
              <span className="text-blue-600 underline decoration-2 underline-offset-4 hover:text-blue-700">
                Browse Files
              </span>
            </p>
            <small className="block text-neutral-500">
              Accepts PDF/DOCX, max 10MB
            </small>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx"
              onChange={handleFileInputChange}
            />
            {file && (
              <div className="mt-3">
                <small className="text-green-700 font-medium">
                  Selected: {file.name}
                </small>
              </div>
            )}
          </div>

          <div className="mb-5">
            <label
              htmlFor="doc-name"
              className="block text-sm font-medium text-neutral-800 mb-2"
            >
              Document Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 shadow-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              id="doc-name"
              placeholder="Auto-filled from file"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium shadow-sm hover:bg-blue-700 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed transition"
              onClick={handleUpload}
              disabled={isUploading || !file}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>

            <button
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-white font-medium shadow-sm hover:bg-emerald-700 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed transition"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !file}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          {error && (
            <div className="mt-5 rounded-md border-l-4 border-red-600 bg-red-50 px-4 py-3 text-red-800">
              {error}
            </div>
          )}
        </div>

        {renderAnalysisTable()}
      </div>
    </div>
  );
}
