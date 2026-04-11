type HeaderProps = {
  cartCount: number;
  favoritesCount: number;
  showClientCounters?: boolean;
  clientView?: "SHOP" | "ORDERS";
  onOpenShop?: () => void;
  onOpenOrders?: () => void;
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
  showClientCounters = true,
  clientView,
  onOpenShop,
  onOpenOrders,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  userDisplayName,
  userRoleLabel,
  onLogout,
}: HeaderProps) {
  const isRestaurantRole = userRoleLabel === "Restaurant";

  return (
    <div className="row" style={{ marginBottom: 12 }}>
      <div className="header-brand">
        <div className="header-title">EcoEats</div>
        <div className={`header-identity ${isRestaurantRole ? "restaurant" : ""}`}>
          <span className="header-user-name">{userDisplayName}</span>
          {!isRestaurantRole ? <span className="header-role-chip">{userRoleLabel}</span> : null}
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
        {showClientCounters && onOpenShop ? (
          <button
            className={clientView === "SHOP" ? "" : "secondary"}
            onClick={onOpenShop}
            type="button"
          >
            Accueil
          </button>
        ) : null}
        {showClientCounters && onOpenOrders ? (
          <button
            className={clientView === "ORDERS" ? "" : "secondary"}
            onClick={onOpenOrders}
            type="button"
          >
            Mes commandes
          </button>
        ) : null}
        {showClientCounters ? <div className="pill">Panier: {cartCount} article(s)</div> : null}
        {showClientCounters ? <div className="pill">Favoris: {favoritesCount}</div> : null}
        <button className="secondary" onClick={onLogout} type="button">
          Deconnexion
        </button>
      </div>
    </div>
  );
}
