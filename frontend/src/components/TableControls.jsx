import React from "react";

                                                                      
export default function TableControls({
  search,
  onSearch,
  searchPlaceholder = "Search records...",
  filters = [],
  sortValue,
  onSort,
  sortOptions = [],
  shown = 0,
  total = 0,
  recordLabel = "records"
}) {
  return (
    <div className="ac-table-controls">
      <label className="ac-table-search">
        <span>Search</span>
        <input
          type="search"
          value={search}
          onChange={event => onSearch(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </label>

      {filters.map(filter => (
        <label className="ac-table-filter" key={filter.key || filter.label}>
          <span>{filter.label}</span>
          <select
            value={filter.value}
            onChange={event => filter.onChange(event.target.value)}
            aria-label={filter.label}
          >
            <option value="all">{filter.allLabel || `All ${filter.label.toLowerCase()}`}</option>
            {filter.options.map(option => {
              const item = typeof option === "string" ? { value: option, label: option } : option;
              return <option key={item.value} value={item.value}>{item.label}</option>;
            })}
          </select>
        </label>
      ))}

      {sortOptions.length > 0 && (
        <label className="ac-table-filter ac-table-sort">
          <span>Sort by</span>
          <select value={sortValue} onChange={event => onSort(event.target.value)} aria-label="Sort by">
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      )}

      <div className="ac-table-count" aria-live="polite">
        Showing <strong>{shown}</strong> of <strong>{total}</strong> {recordLabel}
      </div>
    </div>
  );
}
