import type { SortMode } from "../types";

type CourierToolbarProps = {
  sortMode: SortMode;
  searchQuery: string;
  onSortModeChange: (value: SortMode) => void;
  onSearchChange: (value: string) => void;
};

export function CourierToolbar({
  sortMode,
  searchQuery,
  onSortModeChange,
  onSearchChange,
}: CourierToolbarProps) {
  return (
    <div className="courier-toolbar">
      <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as SortMode)}>
        <option value="SMART">Tri intelligent</option>
        <option value="DISTANCE">Distance</option>
        <option value="TIP">Pourboire</option>
        <option value="URGENCY">Urgence</option>
      </select>
      <input
        type="text"
        placeholder="Filtrer par id, restaurant, statut"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        style={{ minWidth: 280 }}
      />
    </div>
  );
}
