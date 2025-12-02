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
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-base font-semibold">Clause Legend</h4>
        <span className="text-xs text-neutral-500">
          {uniqueCategories.length} categories
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {uniqueCategories.map((name) => (
          <div key={name} className="flex items-center gap-2 truncate">
            <span
              className="inline-flex h-5 min-w-5 rounded-full border border-neutral-300"
              style={{ backgroundColor: clauseColorMap[name] }}
              aria-hidden="true"
            />
            <span className="text-sm text-neutral-700 truncate" title={name}>
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
