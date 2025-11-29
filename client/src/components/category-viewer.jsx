import { useState } from "react";
import categories from "../../data/clauses.json" with { type: "json" };

export default function CategoryViewer({ clause_no, category }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left,
      y: rect.bottom + 8,
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const description =
    categories && categories[clause_no - 1]
      ? categories[clause_no - 1].description
      : "No description available";

  return (
    <div className="relative inline-block">
      <span
        className="text-blue-700 font-medium cursor-help hover:text-blue-900 hover:underline transition"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {category}
      </span>

      {showTooltip && (
        <div
          className="fixed z-50 bg-neutral-900 text-white rounded-lg shadow-lg p-3 max-w-xs text-sm"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold mb-1">{category}</div>
          <div className="text-neutral-200 leading-relaxed">{description}</div>
          <div
            className="absolute w-2 h-2 bg-neutral-900 transform rotate-45"
            style={{
              bottom: "100%",
              left: "50%",
              marginLeft: "-4px",
              marginBottom: "-4px",
            }}
          />
        </div>
      )}
    </div>
  );
}
