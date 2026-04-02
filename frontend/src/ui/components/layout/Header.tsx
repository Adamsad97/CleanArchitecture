type HeaderProps = {
  cartCount: number;
  favoritesCount: number;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  userDisplayName: string;
  userRoleLabel: string;
  onLogout: () => void;
};

export function Header({
  cartCount,
  favoritesCount,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  userDisplayName,
  userRoleLabel,
  onLogout,
}: HeaderProps) {
  return (
    <div className="row" style={{ marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>EcoEats</div>
        <div className="muted">
          Connecte: {userDisplayName} ({userRoleLabel})
        </div>
      </div>
      <div className="header-right">
        <input
          type="text"
          className="header-search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="pill">Panier: {cartCount} article(s)</div>
        <div className="pill">Favoris: {favoritesCount}</div>
        <button className="secondary" onClick={onLogout} type="button">
          Deconnexion
        </button>
      </div>
    </div>
  );
}
