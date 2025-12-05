import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
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
  Zap,
  Settings,
  Shield,
  BarChart3,
  Brain
} from "lucide-react";

export default function Page() {
  const [activeTab, setActiveTab] = useState("home");
  const [_documentCount, setDocumentCount] = useState(0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Navigation Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Tahqiiq
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Legal Document Analysis</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("upload")}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors hidden sm:block"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Home Page - Landing */}
      {activeTab === "home" && (
        <>
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
              <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="space-y-6 sm:space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance">
                      Intelligent Legal Document Analysis
                    </h2>
                    <p className="text-lg sm:text-xl text-muted-foreground text-balance">
                      Extract, analyze, and manage legal clauses with AI-powered precision. Save hours on contract
                      review.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
                    >
                      Start Analyzing
                    </button>
                    <button
                      onClick={() => {
                        const element = document.getElementById("how-to");
                        element?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2"
                    >
                      Learn More <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-primary">100%</div>
                      <p className="text-sm text-muted-foreground">Accurate</p>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-primary">10x</div>
                      <p className="text-sm text-muted-foreground">Faster</p>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-primary">24/7</div>
                      <p className="text-sm text-muted-foreground">Available</p>
                    </div>
                  </div>
                </div>

                {/* Hero Visual */}
                <div className="relative h-96 sm:h-full min-h-96 rounded-xl border border-border/50 bg-card/50 backdrop-blur overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                  <div className="relative text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mx-auto">
                      <Brain className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground max-w-xs">AI-Powered Document Intelligence</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="border-t border-border/40 bg-card/30 py-20 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center space-y-4 mb-16 sm:mb-20">
                <h3 className="text-3xl sm:text-4xl font-bold text-foreground">Powerful Features</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Everything you need for professional document analysis
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {[
                  {
                    icon: FileText,
                    title: "Smart Extraction",
                    description: "Automatically identify and extract all legal clauses from your documents",
                  },
                  {
                    icon: Brain,
                    title: "AI Summarization",
                    description: "Get concise, intelligent summaries of complex legal language",
                  },
                  {
                    icon: Zap,
                    title: "Instant Analysis",
                    description: "Analyze documents in seconds, not hours",
                  },
                  {
                    icon: BarChart3,
                    title: "Comparison Tools",
                    description: "Compare multiple documents side-by-side effortlessly",
                  },
                  {
                    icon: Shield,
                    title: "Secure & Private",
                    description: "Enterprise-grade security for sensitive documents",
                  },
                  {
                    icon: Settings,
                    title: "Full Management",
                    description: "Tag, organize, and manage all your extracted clauses",
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="p-6 sm:p-8 rounded-xl border border-border/50 bg-background hover:border-primary/50 transition-all group"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How to Use Section */}
          <section id="how-to" className="py-20 sm:py-24 border-t border-border/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center space-y-4 mb-16 sm:mb-20">
                <h3 className="text-3xl sm:text-4xl font-bold text-foreground">How to Use Tahqiiq</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">Get started in 4 simple steps</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {[
                  {
                    step: "1",
                    title: "Upload Document",
                    description: "Upload your PDF or DOCX file using drag-and-drop or file selection",
                  },
                  {
                    step: "2",
                    title: "AI Analysis",
                    description: "Our AI automatically identifies and extracts all legal clauses",
                  },
                  {
                    step: "3",
                    title: "Review Results",
                    description: "Browse extracted clauses with AI-generated summaries",
                  },
                  {
                    step: "4",
                    title: "Export & Share",
                    description: "Export results as JSON, CSV, or PDF for further use",
                  },
                ].map((item, i) => (
                  <div key={i} className="space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Video/Demo Placeholder */}
              <div className="mt-16 sm:mt-20 rounded-xl border border-border/50 bg-card/50 overflow-hidden p-6 sm:p-12">
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Interactive demo coming soon</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="border-t border-border/40 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 py-16 sm:py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
              <h3 className="text-3xl sm:text-4xl font-bold text-foreground">Ready to analyze?</h3>
              <p className="text-muted-foreground text-lg">Start reviewing your documents with AI intelligence today</p>
              <button
                onClick={() => setActiveTab("upload")}
                className="px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all inline-block"
              >
                Start Free Analysis
              </button>
            </div>
          </section>
        </>
      )}

      {/* Application Pages */}
      {activeTab === "upload" && (
        <>
          {/* Application Header */}
          <div className="border-b border-border/40 bg-background/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex gap-1 py-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("upload")}
                  className="px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all bg-primary text-primary-foreground"
                >
                  Upload & Analyze
                </button>
              </div>
            </div>
          </div>

          {/* Application Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <DocumentUpload onDocumentProcessed={() => setDocumentCount((c) => c + 1)} />
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/30 mt-12 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid sm:grid-cols-4 gap-8 mb-8 pb-8 border-b border-border/40">
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                  <FileText className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">Tahqiiq</span>
              </div>
              <p className="text-sm text-muted-foreground">Professional legal document analysis powered by AI.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => setActiveTab("home")}
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8">
            <p className="text-sm text-muted-foreground">© 2025 Tahqiiq. All rights reserved.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#" className="text-muted-foreground hover:text-foreground transition">
                Twitter
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">
                LinkedIn
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// DocumentUpload component with all existing functionality
function DocumentUpload({ onDocumentProcessed }) {
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
    const selectedFile = e.target.files?.[0];
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
    const droppedFile = e.dataTransfer.files?.[0];
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
      const path = result?.pdf_path || result?.file_path || result?.path || result?.saved_path || "";
      setUploadedPdfPath(path);
      setUploadComplete(true);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedPdfPath && !file) {
      alert("Please upload the file first.");
      return;
    }

    const pdfPath = uploadedPdfPath || `../client/uploads/${file?.name}`;

    setIsAnalyzing(true);
    setError(null);
    setPredictedClauses(null);

    try {
      const response = await fetch("http://localhost:8000/predict-clauses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_path: pdfPath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setPredictedClauses(result?.predicted_clauses || []);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSummarize = async () => {
    if (!uploadedPdfPath) {
      alert("Please upload the file first.");
      return;
    }

    setIsSummarizing(true);
    setSummaryResult(null);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/summaries/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_path: uploadedPdfPath }),
      });

      if (!response.ok) throw new Error("Failed to start summarization");

      const data = await response.json();
      setSummaryJobId(data.job_id);
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
          onDocumentProcessed?.();
        } else if (data.status === "FAILED") {
          setError(`Summarization failed: ${data.error || "Unknown error"}`);
          setIsSummarizing(false);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Polling error", err);
        setIsSummarizing(false);
        clearInterval(intervalId);
      }
    }, 2000);
  };

  const handleClauseSelection = async (e) => {
    const idx = e.target.value;
    setSelectedClauseIndex(idx);

    if (idx === "" || !predictedClauses) {
      setActiveClauseSummary(null);
      return;
    }

    const clauseIndex = Number.parseInt(idx);
    const clause = predictedClauses[clauseIndex];

    if (!clause) {
      setActiveClauseSummary(null);
      return;
    }

    let jobId = summaryJobId;
    if (!jobId && uploadedPdfPath) {
      try {
        const jobRes = await fetch("http://localhost:8000/summaries/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf_path: uploadedPdfPath }),
        });
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          jobId = jobData.job_id;
          setSummaryJobId(jobId);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (err) {
        console.error("Failed to create job for clause summary:", err);
      }
    }

    setIsGeneratingClause(true);
    setActiveClauseSummary(null);
    setError(null);

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
          next_text: next,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setActiveClauseSummary(data.summary);
    } catch (err) {
      setError(`Clause summarization failed: ${err.message}`);
    } finally {
      setIsGeneratingClause(false);
    }
  };

  const toggleSummaryRow = (index) => {
    setExpandedSummaryRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const renderClauseSummarizationSection = () => {
    if (!predictedClauses || predictedClauses.length === 0) return null;

    return (
      <div className="mt-6 sm:mt-8 bg-card rounded-xl border border-border/50 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Zap className="text-accent w-5 h-5 sm:w-6 sm:h-6" />
          <h4 className="text-lg sm:text-xl font-bold text-foreground">On-Demand Clause Summarization</h4>
        </div>

        <label className="block text-sm font-medium mb-2 text-muted-foreground">
          Select a clause to generate instant AI summary:
        </label>
        <select
          className="w-full p-3 border-2 border-accent rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-2 focus:ring-accent focus:border-accent outline-none cursor-pointer transition-colors appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <option value="" className="bg-card text-foreground">-- Select a Clause --</option>
          {predictedClauses.map((c, idx) => (
            <option key={idx} value={idx} className="bg-card text-foreground">
              Clause {c.clause_no || idx + 1}: {c.category} ({c.clause.substring(0, 40)}...)
            </option>
          ))}
        </select>

        {isGeneratingClause && (
          <div className="flex items-center gap-2 text-accent text-sm animate-pulse mb-4 mt-4">
            <Loader2 className="animate-spin" size={16} /> Generating AI analysis...
          </div>
        )}

        {activeClauseSummary && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 sm:p-5 mt-4 animate-in fade-in">
            <h4 className="text-xs font-bold text-accent uppercase mb-3 tracking-wider">AI Interpretation</h4>
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="ml-2">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                  code: ({ children }) => <code className="bg-accent/20 px-1.5 py-0.5 rounded text-xs font-mono text-accent">{children}</code>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-accent/40 pl-3 italic my-2">{children}</blockquote>,
                }}
              >
                {activeClauseSummary}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {selectedClauseIndex !== "" && !isGeneratingClause && !activeClauseSummary && (
          <div className="text-sm text-muted-foreground italic mt-4">
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
      <div className="mt-6 sm:mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h4 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            AI Summary Report
          </h4>
          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">Model: {model_version}</span>
        </div>

        {/* Executive Summary Card */}
        <div className="bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <h5 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Executive Summary</h5>
          <div className="prose prose-sm sm:prose-base max-w-none text-foreground leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-4 last:mb-0 text-sm sm:text-base">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2 ml-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2 ml-2">{children}</ol>,
                li: ({ children }) => <li className="ml-1">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl sm:text-2xl font-bold mb-3 mt-6 first:mt-0 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg sm:text-xl font-bold mb-2 mt-5 first:mt-0 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base sm:text-lg font-bold mb-2 mt-4 first:mt-0 text-foreground">{children}</h3>,
                code: ({ children }) => <code className="bg-primary/10 px-2 py-1 rounded text-xs sm:text-sm font-mono text-primary">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/40 pl-4 italic my-3 text-muted-foreground">{children}</blockquote>,
                hr: () => <hr className="my-4 border-border" />,
              }}
            >
              {document_summary || "Document summary unavailable."}
            </ReactMarkdown>
          </div>
        </div>

        {/* Clause Summaries Table (if any exist from batch processing) */}
        {clause_summaries && clause_summaries.length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h5 className="font-semibold text-foreground text-sm sm:text-base">Clause Breakdown</h5>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{clause_summaries.length} clauses processed</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-card text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left w-12 sm:w-16 text-xs sm:text-sm">#</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left w-1/4 text-xs sm:text-sm">Category</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm">Summary</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs sm:text-sm">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {clause_summaries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-muted-foreground text-xs sm:text-sm">{item.clause_no}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="space-y-2">
                          <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 ml-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">{children}</ol>,
                                li: ({ children }) => <li className="ml-1">{children}</li>,
                                code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                              }}
                            >
                              {item.summary_text}
                            </ReactMarkdown>
                          </div>
                          {/* Expandable Original Text */}
                          <button
                            onClick={() => toggleSummaryRow(idx)}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                          >
                            {expandedSummaryRows[idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {expandedSummaryRows[idx] ? "Hide Original Text" : "Show Original Text"}
                          </button>
                          {expandedSummaryRows[idx] && (
                            <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50 text-xs text-muted-foreground italic">
                              "{item.original_text}"
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        {item.is_failed ? (
                          <span className="text-destructive flex items-center justify-end gap-1 text-xs"><AlertTriangle size={14} /> Failed</span>
                        ) : (
                          <span className="text-secondary flex items-center justify-end gap-1 text-xs"><CheckCircle size={14} /> Ready</span>
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
      <div className="mt-6 sm:mt-8 bg-card rounded-xl border border-border/50 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h4 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            Clause Extraction Results
          </h4>
        </div>

        <div className="mb-3 sm:mb-4">
          <input
            type="text"
            placeholder="Search clauses..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 outline-none focus:ring-2 focus:ring-primary transition text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-border/50 mb-4 sm:mb-6">
          <div className="overflow-x-auto max-h-[300px] sm:max-h-[400px]">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-muted/30 text-foreground sticky top-0 z-10">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium border-b border-border/50 text-xs sm:text-sm">Text Snippet</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium border-b border-border/50 text-xs sm:text-sm">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredClauses.map((item, index) => (
                  <tr key={`pred-${index}`} className="hover:bg-muted/30">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground w-2/3 text-xs sm:text-sm">
                      {item.clause.length > 100 ? `${item.clause.substring(0, 100)}...` : item.clause}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 w-1/3">
                      <CategoryViewer clause_no={item.clause_no} category={item.category} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isPDF && predictedClauses.length > 0 && (
          <div className="mt-4 sm:mt-6 space-y-4">
            <div className="border-t border-border/50 pt-4 sm:pt-6">
              <h5 className="font-medium text-foreground mb-3 sm:mb-4 text-sm sm:text-base">PDF Visualization</h5>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                <div className="lg:col-span-3 border border-border/50 rounded-lg overflow-hidden h-[400px] sm:h-[500px] lg:h-[600px]">
                  <PDFViewerWithHighlights file={file} predictedClauses={predictedClauses} />
                </div>
                <div className="lg:col-span-2">
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
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 sm:p-12 transition-all ${isDragOver ? "border-primary bg-primary/10" : "border-border/50 bg-muted/30"
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            {file ? file.name : "Upload your document"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {file ? "Ready to process" : "Drag and drop your PDF or DOCX file here"}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={handleBrowseClick}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Browse Files
            </button>
            {file && (
              <button
                onClick={() => setFile(null)}
                className="px-6 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <input ref={fileInputRef} type="file" onChange={handleFileInputChange} className="hidden" accept=".pdf,.docx" />
      </div>

      {/* Action Buttons */}
      {file && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleUpload}
            disabled={isUploading || uploadComplete}
            className="px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploadComplete ? "Uploaded" : "Upload"}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!uploadComplete || isAnalyzing}
            className="px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
            Analyze Clauses
          </button>
          <button
            onClick={handleSummarize}
            disabled={!uploadComplete || isSummarizing}
            className="px-4 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSummarizing && <Loader2 className="w-4 h-4 animate-spin" />}
            Summarize
          </button>
        </div>
      )}

      {/* Clause Selection Dropdown */}
      {predictedClauses && predictedClauses.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Zap className="text-accent w-5 h-5 sm:w-6 sm:h-6" />
            <h4 className="text-lg sm:text-xl font-bold text-foreground">On-Demand Clause Summarization</h4>
          </div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            Select a clause to generate instant AI summary:
          </label>
          <select
            className="w-full p-3 border-2 border-accent rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-2 focus:ring-accent focus:border-accent outline-none cursor-pointer transition-colors appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <option value="" className="bg-card text-foreground">-- Select a Clause --</option>
            {predictedClauses.map((c, idx) => (
              <option key={idx} value={idx} className="bg-card text-foreground">
                Clause {c.clause_no || idx + 1}: {c.category}
              </option>
            ))}
          </select>

          {isGeneratingClause && (
            <div className="flex items-center gap-2 text-accent text-sm animate-pulse mb-4 mt-4">
              <Loader2 className="animate-spin" size={16} /> Generating AI analysis...
            </div>
          )}

          {activeClauseSummary && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 sm:p-5 mt-4 animate-in fade-in">
              <h4 className="text-xs font-bold text-accent uppercase mb-3 tracking-wider">AI Interpretation</h4>
              <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="ml-2">{children}</li>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                    code: ({ children }) => <code className="bg-accent/20 px-1.5 py-0.5 rounded text-xs font-mono text-accent">{children}</code>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-accent/40 pl-3 italic my-2">{children}</blockquote>,
                  }}
                >
                  {activeClauseSummary}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Sections */}
      {renderAnalysisTable()}
      {renderClauseSummarizationSection()}
      {renderSummarizationSection()}
    </div>
  );
}
