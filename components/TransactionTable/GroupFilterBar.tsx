import { X } from "lucide-react";

interface GroupFilterBarProps {
  activeFilters: string[];
  descSearch: string;
  uniqueCategories: string[];
  isFiltered: boolean;
  onFilterChange: (categories: string[]) => void;
  onDescSearchChange: (value: string) => void;
  onClearFilters: () => void;
}

const GroupFilterBar = ({
  activeFilters,
  descSearch,
  uniqueCategories,
  isFiltered,
  onFilterChange,
  onDescSearchChange,
  onClearFilters,
}: GroupFilterBarProps) => {
  const tdClass = `border-r border-gray-100 dark:border-gray-800`;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 bg-transparent">
      {/* Clear button */}
      <td className={`py-1.5 w-8 align-middle text-center ${tdClass}`}>
        {isFiltered && (
          <button
            onClick={onClearFilters}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear filters"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </td>

      {/* Date col — empty */}
      <td className={`py-1.5 ${tdClass}`} />

      {/* Description search */}
      <td className={`px-4 py-1.5 ${tdClass}`}>
        <input
          type="text"
          placeholder="Search..."
          value={descSearch}
          onChange={(e) => onDescSearchChange(e.target.value)}
          className="h-6 w-full bg-transparent text-[12px] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 rounded px-1.5 outline-none transition-colors"
        />
      </td>

      {/* Category filter */}
      <td className={`px-4 py-1.5 ${tdClass}`}>
        <select
          value={activeFilters.length === 0 ? "__all__" : activeFilters[0]}
          onChange={(e) =>
            onFilterChange(e.target.value !== "__all__" ? [e.target.value] : [])
          }
          className="h-6 w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-[12px] text-gray-700 dark:text-gray-300 px-1.5 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors cursor-pointer"
        >
          <option value="__all__">All</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "" ? "None" : cat}
            </option>
          ))}
        </select>
      </td>

      {/* Remaining cols */}
      <td className={tdClass} />
      <td className={tdClass} />
      <td className={tdClass} />
      <td className={tdClass} />
      <td className={tdClass} />
    </tr>
  );
};

export default GroupFilterBar;
