import { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Util } from "pdfjs-dist";

// Set up PDF.js worker with local fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/node_modules/pdfjs-dist/build/pdf.worker.min.mjs`;
} catch (error) {
  console.warn("Failed to set local PDF.js worker, using CDN fallback");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// Color scheme for different clause types (by category)
const getClauseColor = (clauseName) => {
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
  return colorMap[clauseName] || "#FFFF00";
};

// RGBA color helper for translucent highlight backgrounds
const hexToRgba = (hex, alpha = 0.12) => {
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
    return `rgba(255, 255, 0, ${alpha})`; // fallback to a light yellow
  }
};

export default function PDFViewerWithHighlights({ file, predictedClauses }) {
  const [pdf, setPdf] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF when file changes
  useEffect(() => {
    if (file && file.type === "application/pdf") {
      setIsLoading(true);
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        const typedArray = new Uint8Array(this.result);
        try {
          const loadingTask = pdfjsLib.getDocument({
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
          // fallback to CDN assets
          try {
            const loadingTask = pdfjsLib.getDocument({
              data: typedArray,
              cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`,
            });
            const loadedPdf = await loadingTask.promise;
            setPdf(loadedPdf);
            setTotalPages(loadedPdf.numPages);
            setCurrentPage(1);
            setIsLoading(false);
          } catch (altError) {
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
      setPdf(null);
      setTotalPages(0);
      setCurrentPage(1);
      setIsLoading(false);
    }
  }, [file]);

  // Render current page
  useEffect(() => {
    if (pdf && currentPage && !isLoading) {
      renderPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, currentPage, scale]);

  // Render highlights when predictedClauses change
  useEffect(() => {
    if (predictedClauses && pdf && !isLoading) {
      setTimeout(() => renderHighlights(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictedClauses, currentPage, scale, isLoading]);

  const renderPage = async () => {
    if (
      !pdf ||
      !canvasRef.current ||
      currentPage < 1 ||
      currentPage > totalPages
    ) {
      return;
    }
    try {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = { canvasContext: context, viewport };
      await page.render(renderContext).promise;

      if (highlightLayerRef.current) {
        highlightLayerRef.current.style.width = `${viewport.width}px`;
        highlightLayerRef.current.style.height = `${viewport.height}px`;
      }
    } catch (error) {
      // noop
    }
  };

  const renderHighlights = async () => {
    if (!pdf || !predictedClauses || !highlightLayerRef.current) return;

    try {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();

      // Clear previous highlights
      highlightLayerRef.current.innerHTML = "";

      // Iterate over predicted clauses (array of { clause_no, category, clause })
      predictedClauses.forEach((item) => {
        const clauseName = item?.category || "Unknown";
        const color = getClauseColor(clauseName);
        const text = item?.clause || "";
        if (!text) return;

        highlightTextInPage(
          text,
          color,
          textContent.items,
          viewport,
          clauseName
        );
      });
    } catch (error) {
      // noop
    }
  };

  const highlightTextInPage = (
    searchText,
    color,
    textItems,
    viewport,
    clauseName
  ) => {
    if (!searchText || searchText.length < 3) return;

    // 1. Normalize the Search Target
    const normalizedTarget = searchText
      .replace(/\s+/g, "") // Remove ALL whitespace for stricter matching
      .toLowerCase();

    // 2. Build a Global String & Index Map
    // We create a single long string of the whole page text,
    // and map every character index back to the specific item it came from.
    let fullPageStr = "";
    const charToItemMap = [];

    textItems.forEach((item, itemIndex) => {
      const rawStr = item.str;
      // We perform the same normalization on the page text
      const cleanStr = rawStr.replace(/\s+/g, "").toLowerCase();
      
      for (let c = 0; c < cleanStr.length; c++) {
        fullPageStr += cleanStr[c];
        charToItemMap.push(itemIndex);
      }
    });

    // 3. Find the Target in the Global String
    // using indexOf allows us to find the exact character start position
    let startIndex = 0;
    const foundIndices = [];
    
    // Allow finding multiple occurrences of the same clause on one page
    while ((startIndex = fullPageStr.indexOf(normalizedTarget, startIndex)) !== -1) {
      foundIndices.push({
        start: startIndex,
        end: startIndex + normalizedTarget.length
      });
      startIndex += normalizedTarget.length;
    }

    if (foundIndices.length === 0) return;

    // 4. Map Character Indices Back to Items
    const itemsToHighlight = new Set();
    
    foundIndices.forEach(({ start, end }) => {
      // Loop through the range of characters in the match
      for (let i = start; i < end; i++) {
        const itemIndex = charToItemMap[i];
        if (itemIndex !== undefined) {
          itemsToHighlight.add(textItems[itemIndex]);
        }
      }
    });

    // 5. Draw Highlights (Corrected Coordinates)
    itemsToHighlight.forEach((item) => {
      // Check for empty items to avoid drawing 0px boxes
      if (!item.str || !item.str.trim()) return;

      const highlight = document.createElement("div");

      // Styles
      const bg = hexToRgba(color, 0.25); // Slightly darker for better visibility
      const border = hexToRgba(color, 0.55);

      highlight.style.cssText = `
        position: absolute;
        background: ${bg};
        border-bottom: 2px solid ${border}; /* Underline style is often cleaner */
        border-radius: 2px;
        cursor: pointer;
        z-index: 10;
      `;

      // --- COORDINATE FIX ---
      // viewport.transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
      // PDF.js text items are bottom-left origin.
      // We use the util to convert to [x, y] in Canvas Space (Top-Left origin)
      const tx = pdfjsLib.Util.transform(
        viewport.transform,
        item.transform
      );

      // tx[5] is the y-coordinate of the text BASELINE.
      // To highlight the text, we need to go UP from the baseline by the font height.
      
      // Calculate font height/width accurately from the transform matrix
      // hypot(scaleX, skewY) gives the horizontal scaling
      // hypot(skewX, scaleY) gives the vertical scaling (font height)
      const fontHeight = Math.hypot(tx[2], tx[3]);
      const fontWidth = item.width * viewport.scale; // Width is usually safe

      const x = tx[4];
      const yBaseline = tx[5]; 

      // Position the box
      // Top = Baseline - Height (Since HTML Y grows downwards)
      highlight.style.left = `${x}px`;
      highlight.style.top = `${yBaseline - fontHeight}px`;
      highlight.style.width = `${fontWidth}px`;
      highlight.style.height = `${fontHeight}px`;

      // Metadata
      highlight.title = `${clauseName}: "${searchText.slice(0, 50)}..."`;

      highlightLayerRef.current.appendChild(highlight);
    });
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1.2);
  const handlePageInputChange = (e) => {
    const page = Math.max(
      1,
      Math.min(totalPages, Number.parseInt(e.target.value) || 1)
    );
    setCurrentPage(page);
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-4xl mb-2">📄</div>
        </div>
      </div>
    );
  }

  if (file.type !== "application/pdf") {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-gray-500">
            PDF highlighting is only available for PDF files
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">🔄</div>
          <p className="text-gray-500">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (totalPages === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-red-300">
        <div className="text-center">
          <div className="text-4xl mb-2">❌</div>
          <p className="text-red-500">
            Error loading PDF. Please try a different file.
          </p>
        </div>
      </div>
    );
  }

  const totalHighlights = Array.isArray(predictedClauses)
    ? predictedClauses.length
    : 0;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="bg-neutral-50/80 px-6 py-3 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-neutral-900 flex items-center">
            <span className="mr-2">📄</span>
            PDF Viewer with Highlights
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="px-3 py-1 rounded-md border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 disabled:bg-neutral-200 disabled:text-neutral-500 text-sm transition"
            >
              −
            </button>
            <button
              onClick={resetZoom}
              className="px-3 py-1 rounded-md border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 text-sm transition"
              title="Reset zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="px-3 py-1 rounded-md border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 disabled:bg-neutral-200 disabled:text-neutral-500 text-sm transition"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div
          ref={containerRef}
          className="relative border border-neutral-300 rounded-lg overflow-auto bg-neutral-100/60 shadow-inner"
          style={{ maxHeight: "75vh" }}
        >
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              className="block bg-white shadow-sm"
              style={{ maxWidth: "100%" }}
            />
            <div
              ref={highlightLayerRef}
              className="absolute inset-0 pointer-events-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 bg-neutral-50/80 px-4 py-3 rounded-lg border border-neutral-200">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed font-medium transition"
          >
            <span className="mr-2">←</span> Previous
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-700">Page</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={handlePageInputChange}
              className="w-16 rounded-md border border-neutral-300 bg-white px-2 py-1 text-center text-sm shadow-xs"
            />
            <span className="text-sm text-neutral-700">of {totalPages}</span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed font-medium transition"
          >
            Next <span className="ml-2">→</span>
          </button>
        </div>

        {totalHighlights > 0 && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
            <p className="text-sm text-blue-800">
              <span className="font-medium">{totalHighlights}</span> clause
              {totalHighlights !== 1 ? "s" : ""} highlighted across the document
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
