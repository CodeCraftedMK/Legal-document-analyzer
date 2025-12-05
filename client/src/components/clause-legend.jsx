import { getClauseColor } from "./pdf-viewer";

/* new legend that maps predictedClauses categories to colors */
export default function ClauseLegend({ predictedClauses }) {
  if (!Array.isArray(predictedClauses) || predictedClauses.length === 0)
    return null;

  const clauseColorMap = {};
  const uniqueCategories = [];

  predictedClauses.forEach((item) => {
    const name = item?.category || "Unknown";
    if (!(name in clauseColorMap)) {
      clauseColorMap[name] = getClauseColor(name);
      uniqueCategories.push(name);
    }
  });

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 sm:p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base sm:text-lg font-semibold text-foreground">Clause Legend</h4>
        <span className="text-xs sm:text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {uniqueCategories.length} {uniqueCategories.length === 1 ? 'category' : 'categories'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-2">
        {uniqueCategories.map((name) => (
          <div key={name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <span
              className="inline-flex h-6 w-6 sm:h-7 sm:w-7 rounded-full border-2 border-border flex-shrink-0 shadow-sm"
              style={{ backgroundColor: clauseColorMap[name] }}
              aria-hidden="true"
            />
            <span className="text-sm sm:text-base text-foreground font-medium break-words" title={name}>
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
