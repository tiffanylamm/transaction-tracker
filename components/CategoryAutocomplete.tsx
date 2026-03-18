"use client";
import { Autocomplete } from "@base-ui/react";

interface CategoryAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  className?: string;
  onBlur?: () => void;
  onCancel?: () => void;
  onCommit?: (val: string) => void;
}

const CategoryAutocomplete = ({
  value,
  onChange,
  suggestions,
  onBlur,
  onCancel,
  onCommit,
}: CategoryAutocompleteProps) => {
  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions;

  return (
    <Autocomplete.Root
      value={value}
      onValueChange={(val, eventDetails) => {
        const v = val ?? "";
        if (eventDetails.reason === "item-press") {
          onCommit?.(v);
        } else {
          onChange(v);
        }
      }}
      items={filtered}
      mode="both"
      openOnInputClick
    >
      <Autocomplete.Input
        className={`w-full bg-transparent border border-gray-200 focus:ring-1 focus:ring-gray-200 px-3 py-1 text-[13px] text-gray-900 placeholder-gray-400 transition-colors outline-none rounded-md`}
        placeholder="Category..."
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit?.(value);
          } else if (e.key === "Escape") {
            onCancel?.();
          }
        }}
        autoFocus
        onFocus={(e) => e.target.select()}
      />
      {filtered.length > 0 && (
        <Autocomplete.Portal>
          <Autocomplete.Positioner sideOffset={4} side="bottom" align="start">
            <Autocomplete.Popup className="z-50 min-w-[8rem] rounded-md border border-gray-200 bg-white py-1 shadow-md outline-none">
              <Autocomplete.List>
                {filtered.map((item) => (
                  <Autocomplete.Item
                    key={item}
                    value={item}
                    className="group cursor-pointer px-1 outline-none select-none"
                  >
                    <div className="px-2 py-1.5 text-[13px] text-gray-700 rounded-md transition-colors group-data-[highlighted]:bg-gray-100">
                      {item}
                    </div>
                  </Autocomplete.Item>
                ))}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      )}
    </Autocomplete.Root>
  );
};

export default CategoryAutocomplete;
