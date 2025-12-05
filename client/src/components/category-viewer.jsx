import { useState } from "react";
import categories from "../../data/clauses.json" with { type: "json" };

export default function CategoryViewer({ clause_no, category }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const tooltipWidth = 320; // max-w-xs = 320px
    
    // Calculate position with boundary checks
    let x = rect.left + (rect.width / 2);
    let y = rect.bottom + 8;
    
    // Adjust if tooltip would go off screen
    if (x + (tooltipWidth / 2) > viewportWidth - 16) {
      x = viewportWidth - (tooltipWidth / 2) - 16;
    } else if (x - (tooltipWidth / 2) < 16) {
      x = (tooltipWidth / 2) + 16;
    }
    
    setTooltipPosition({ x, y });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Look up by category name instead of clause_no index
  const categoryData = categories?.find(cat => cat.category === category);
  const description = categoryData?.description || "No description available";

  return (
    <div className="relative inline-block">
      <span
        className="text-primary font-medium cursor-help hover:text-primary/80 hover:underline transition"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {category}
      </span>

      {showTooltip && (
        <div
          className="fixed z-50 bg-foreground text-background rounded-lg shadow-xl p-3 max-w-xs text-sm pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold mb-1.5 text-base">{category}</div>
          <div className="text-background/90 leading-relaxed text-sm">{description}</div>
          <div
            className="absolute w-2 h-2 bg-foreground transform rotate-45"
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
