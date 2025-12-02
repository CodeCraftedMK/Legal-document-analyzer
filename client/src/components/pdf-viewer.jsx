import { useState, useEffect, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
  Loader2,
} from "lucide-react";

// Shared utility for colors - exported for use in other components
export const getClauseColor = (clauseName) => {
  const colorMap = {
    "Document Name": "#FFB347",
    Parties: "#FF6B6B",
    "Agreement Date": "#4ECDC4",
    "Effective Date": "#45B7D1",
    "Expiration Date": "#96CEB4",
    "Renewal Term": "#98D8C8",
    "Notice to Terminate Renewal": "#DDA0DD",
    "Governing Law": "#FFEAA7",
    "Most Favored Nation": "#F8BBD9",
    "Non-Compete": "#E17055",
    Exclusivity: "#A29BFE",
    "No-Solicit of Customers": "#FD79A8",
    "Competitive Restriction Exception": "#FDCB6E",
    "No-Solicit of Employees": "#6C5CE7",
    "Non-Disparagement": "#00B894",
    "Termination for Convenience": "#E84393",
    "Right of First Refusal, Offer or Negotiation (ROFR/ROFO/ROFN)": "#00CEC9",
    "Change of Control": "#FF7675",
    "Anti-Assignment": "#74B9FF",
    "Revenue/Profit Sharing": "#55A3FF",
    "Price Restriction": "#FD79A8",
    "Minimum Commitment": "#FDCB6E",
    "Volume Restriction": "#6C5CE7",
    "IP Ownership Assignment": "#00B894",
    "Joint IP Ownership": "#E17055",
    "License Grant": "#A29BFE",
    "Non-Transferable License": "#FD79A8",
    "Affiliate IP License-Licensor": "#FDCB6E",
    "Affiliate IP License-Licensee": "#74B9FF",
    "Unlimited/All-You-Can-Eat License": "#55A3FF",
    "Irrevocable or Perpetual License": "#00CEC9",
    "Source Code Escrow": "#E84393",
    "Post-Termination Services": "#00B894",
    "Audit Rights": "#FF7675",
    "Uncapped Liability": "#E17055",
    "Cap on Liability": "#A29BFE",
    "Liquidated Damages": "#FD79A8",
    "Warranty Duration": "#FDCB6E",
    Insurance: "#74B9FF",
    "Covenant not to Sue": "#55A3FF",
    "Third Party Beneficiary": "#00CEC9",
    "O-label": "#E6E6FA",
  };
  return colorMap[clauseName] || "#FFE66D";
};

// RGBA color helper for translucent highlight backgrounds
const hexToRgba = (hex, alpha = 0.25) => {
  try {
    let c = hex.replace("#", "");
    if (c.length === 3)
      c = c
        .split("")
        .map((ch) => ch + ch)
        .join("");
    const r = Number.parseInt(c.slice(0, 2), 16);
    const g = Number.parseInt(c.slice(2, 4), 16);
    const b = Number.parseInt(c.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(255, 230, 109, ${alpha})`; // fallback
  }
};

export default function PDFViewerWithHighlights({ file, predictedClauses }) {
  const [pdf, setPdf] = useState(null);
  const [pdfLib, setPdfLib] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fitToWidth, setFitToWidth] = useState(true);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // 0. Load PDF.js - try local first, fallback to CDN
  useEffect(() => {
    const loadLibrary = async () => {
      // Try to use local pdfjs-dist first
      try {
        const pdfjsModule = await import("pdfjs-dist");
        const pdfjsLib = pdfjsModule.default || pdfjsModule;
        
        // Try to set up local worker
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/node_modules/pdfjs-dist/build/pdf.worker.min.mjs`;
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
        
        setPdfLib(pdfjsLib);
        setIsLoading(false);
        return;
      } catch (error) {
        console.warn("Local PDF.js not available, loading from CDN");
      }

      // Fallback to CDN
      if (window.pdfjsLib) {
        setPdfLib(window.pdfjsLib);
        setIsLoading(false);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfLib(window.pdfjsLib);
        setIsLoading(false);
      };
      script.onerror = () => {
        setIsLoading(false);
        console.error("Failed to load PDF.js from CDN");
      };
      document.body.appendChild(script);
    };

    loadLibrary();
  }, []);

  // 1. Load PDF Document once lib is ready
  useEffect(() => {
    if (file && file.type === "application/pdf" && pdfLib) {
      setIsLoading(true);
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        const typedArray = new Uint8Array(this.result);
        try {
          const loadingTask = pdfLib.getDocument({
            data: typedArray,
            cMapUrl: `/node_modules/pdfjs-dist/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `/node_modules/pdfjs-dist/standard_fonts/`,
          });
          const loadedPdf = await loadingTask.promise;
          setPdf(loadedPdf);
          setTotalPages(loadedPdf.numPages);
          setCurrentPage(1);
          setIsLoading(false);
        } catch (error) {
          // Fallback to CDN assets
          try {
            const loadingTask = pdfLib.getDocument({
              data: typedArray,
              cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfLib.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfLib.version}/standard_fonts/`,
            });
            const loadedPdf = await loadingTask.promise;
            setPdf(loadedPdf);
            setTotalPages(loadedPdf.numPages);
            setCurrentPage(1);
            setIsLoading(false);
          } catch (altError) {
            console.error("PDF Load Error:", altError);
            setTotalPages(0);
            setPdf(null);
            setIsLoading(false);
          }
        }
      };
      fileReader.onerror = () => {
        setTotalPages(0);
        setPdf(null);
        setIsLoading(false);
      };
      fileReader.readAsArrayBuffer(file);
    } else {
      if (!file) {
        setPdf(null);
        setIsLoading(false);
      }
      if (file && !pdfLib) {
        setIsLoading(true);
      }
    }
  }, [file, pdfLib]);

  // 2. Responsive Scaling Logic
  const updateScaleToFit = useCallback(async () => {
    if (!pdf || !containerRef.current || !fitToWidth) return;

    try {
      const page = await pdf.getPage(currentPage);
      const unscaledViewport = page.getViewport({ scale: 1, rotation });
      const containerWidth = containerRef.current.clientWidth - 48; // -48 for padding
      const newScale = containerWidth / unscaledViewport.width;
      setScale(newScale);
    } catch (e) {
      console.error("Scaling error:", e);
    }
  }, [pdf, currentPage, fitToWidth, rotation]);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current || !fitToWidth) return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => updateScaleToFit());
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScaleToFit, fitToWidth]);

  // 3. Render Page & Highlights
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !pdfLib) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    try {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale, rotation });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);

      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: context,
        viewport,
        transform,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;

      if (highlightLayerRef.current) {
        highlightLayerRef.current.style.width = `${Math.floor(viewport.width)}px`;
        highlightLayerRef.current.style.height = `${Math.floor(viewport.height)}px`;
      }

      renderHighlights(page, viewport);
    } catch (error) {
      if (error.name !== "RenderingCancelledException") {
        console.error("Render Error:", error);
      }
    }
  }, [pdf, currentPage, scale, rotation, pdfLib]);

  useEffect(() => {
    if (pdf && !isLoading && pdfLib) {
      renderPage();
    }
  }, [pdf, currentPage, scale, rotation, isLoading, pdfLib, renderPage]);

  // 4. Improved Highlight Logic with sophisticated text matching
  const renderHighlights = async (page, viewport) => {
    if (!predictedClauses || !highlightLayerRef.current || !pdfLib) return;

    highlightLayerRef.current.innerHTML = "";

    const textContent = await page.getTextContent();

    // Iterate over predicted clauses
    predictedClauses.forEach((item) => {
      const clauseName = item?.category || "Unknown";
      const color = getClauseColor(clauseName);
      const searchText = item?.clause || "";
      if (!searchText || searchText.length < 3) return;

      highlightTextInPage(searchText, color, textContent.items, viewport, clauseName, pdfLib);
    });
  };

  const highlightTextInPage = (
    searchText,
    color,
    textItems,
    viewport,
    clauseName,
    pdfLib
  ) => {
    if (!searchText || searchText.length < 3) return;

    // 1. Normalize the Search Target
    const normalizedTarget = searchText
      .replace(/\s+/g, "") // Remove ALL whitespace for stricter matching
      .toLowerCase();

    // 2. Build a Global String & Index Map
    let fullPageStr = "";
    const charToItemMap = [];

    textItems.forEach((item, itemIndex) => {
      const rawStr = item.str;
      const cleanStr = rawStr.replace(/\s+/g, "").toLowerCase();

      for (let c = 0; c < cleanStr.length; c++) {
        fullPageStr += cleanStr[c];
        charToItemMap.push(itemIndex);
      }
    });

    // 3. Find the Target in the Global String
    let startIndex = 0;
    const foundIndices = [];

    while (
      (startIndex = fullPageStr.indexOf(normalizedTarget, startIndex)) !== -1
    ) {
      foundIndices.push({
        start: startIndex,
        end: startIndex + normalizedTarget.length,
      });
      startIndex += normalizedTarget.length;
    }

    if (foundIndices.length === 0) return;

    // 4. Map Character Indices Back to Items
    const itemsToHighlight = new Set();

    foundIndices.forEach(({ start, end }) => {
      for (let i = start; i < end; i++) {
        const itemIndex = charToItemMap[i];
        if (itemIndex !== undefined) {
          itemsToHighlight.add(textItems[itemIndex]);
        }
      }
    });

    // 5. Draw Highlights
    const Util = pdfLib?.Util || window.pdfjsLib?.Util;
    if (!Util) return;

    itemsToHighlight.forEach((item) => {
      if (!item.str || !item.str.trim()) return;

      const transform = Util.transform(viewport.transform, item.transform);

      const fontHeight = Math.hypot(transform[2], transform[3]);
      const fontWidth = item.width * viewport.scale;

      const x = transform[4];
      const yBaseline = transform[5];

      const highlight = document.createElement("div");
      const bg = hexToRgba(color, 0.25);
      const border = hexToRgba(color, 0.55);

      highlight.style.cssText = `
        position: absolute;
        background: ${bg};
        border-bottom: 2px solid ${border};
        border-radius: 2px;
        cursor: pointer;
        z-index: 10;
        left: ${x}px;
        top: ${yBaseline - fontHeight}px;
        width: ${fontWidth}px;
        height: ${fontHeight}px;
      `;

      highlight.title = `${clauseName}: "${searchText.slice(0, 50)}..."`;

      highlightLayerRef.current.appendChild(highlight);
    });
  };

  // 5. Handlers
  const handleZoomIn = () => {
    setFitToWidth(false);
    setScale((s) => Math.min(s + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setFitToWidth(false);
    setScale((s) => Math.max(s - 0.2, 0.5));
  };

  const handleFitWidth = () => {
    setFitToWidth(true);
    updateScaleToFit();
  };

  const handlePageChange = (e) => {
    const page = Math.min(
      Math.max(1, Number.parseInt(e.target.value) || 1),
      totalPages
    );
    setCurrentPage(page);
  };

  if (!file) return <EmptyState />;
  if (file.type !== "application/pdf") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
        <Search size={48} className="mb-4 opacity-50" />
        <p>PDF highlighting is only available for PDF files</p>
      </div>
    );
  }
  if (isLoading) return <LoadingState />;
  if (totalPages === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-red-300 text-red-500">
        <Loader2 size={48} className="mb-4" />
        <p>Error loading PDF. Please try a different file.</p>
      </div>
    );
  }

  const totalHighlights = Array.isArray(predictedClauses)
    ? predictedClauses.length
    : 0;

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* TOOLBAR */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-10">
        {/* Page Nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition"
            title="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-slate-600">
            Page{" "}
            <input
              type="number"
              value={currentPage}
              onChange={handlePageChange}
              className="w-10 text-center border rounded mx-1 focus:ring-2 focus:ring-blue-500 outline-none"
              min="1"
              max={totalPages}
            />{" "}
            / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition"
            title="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-white hover:shadow-sm rounded transition"
            title="Zoom Out"
          >
            <ZoomOut size={16} className="text-slate-600" />
          </button>
          <span className="text-xs font-mono w-12 text-center text-slate-600">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-white hover:shadow-sm rounded transition"
            title="Zoom In"
          >
            <ZoomIn size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 hover:bg-slate-100 rounded text-slate-600 transition"
            title="Rotate"
          >
            <RotateCw size={18} />
          </button>
          <button
            onClick={handleFitWidth}
            className={`p-2 rounded transition ${
              fitToWidth
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-slate-100 text-slate-600"
            }`}
            title="Fit to Width"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>

      {/* VIEWER AREA */}
      <div
        className="flex-1 overflow-auto relative p-6 flex justify-center"
        ref={containerRef}
      >
        <div
          className="relative shadow-lg transition-transform duration-200 ease-out"
          style={{ width: "fit-content", height: "fit-content" }}
        >
          <canvas ref={canvasRef} className="block bg-white rounded-sm" />
          <div
            ref={highlightLayerRef}
            className="absolute inset-0 pointer-events-none"
          />
        </div>
      </div>

      {/* Highlights Info */}
      {totalHighlights > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-medium">{totalHighlights}</span> clause
            {totalHighlights !== 1 ? "s" : ""} highlighted across the document
          </p>
        </div>
      )}
    </div>
  );
}

const EmptyState = () => (
  <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
    <Search size={48} className="mb-4 opacity-50" />
    <p>No document loaded</p>
  </div>
);

const LoadingState = () => (
  <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
    <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
    <p className="text-sm text-slate-500 font-medium">Rendering PDF...</p>
  </div>
);
