export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
  }
}

export class CartRestaurantMismatchError extends DomainError {
  readonly code = "CART_RESTAURANT_MISMATCH";

  constructor() {
    super(
      "Le panier contient déjà des articles d'un autre restaurant. Videz le panier ou annulez."
    );
  }
}

export class MenuItemOutOfStockError extends DomainError {
  readonly code = "MENU_ITEM_OUT_OF_STOCK";

  constructor() {
    super("Le plat n'est plus disponible.");
  }
}

export class InvalidOrderStatusTransitionError extends DomainError {
  readonly code = "INVALID_ORDER_STATUS_TRANSITION";

  constructor() {
    super("Transition de statut de commande invalide.");
  }
}

export class CourierNotAvailableError extends DomainError {
  readonly code = "COURIER_NOT_AVAILABLE";

  constructor() {
    super("Le livreur n'est pas disponible.");
  }
}

export class CourierCapacityExceededError extends DomainError {
  readonly code = "COURIER_CAPACITY_EXCEEDED";

  constructor() {
    super("Le livreur ne peut pas accepter plus de livraisons.");
  }
}

export class OrderNotFoundError extends DomainError {
  readonly code = "ORDER_NOT_FOUND";

  constructor() {
    super("Commande introuvable.");
  }
}

export class RestaurantNotFoundError extends DomainError {
  readonly code = "RESTAURANT_NOT_FOUND";

  constructor() {
    super("Restaurant introuvable.");
  }
}

export class MenuItemNotFoundError extends DomainError {
  readonly code = "MENU_ITEM_NOT_FOUND";

  constructor() {
    super("Plat introuvable.");
  }
}

export class AccountEmailAlreadyUsedError extends DomainError {
  readonly code = "ACCOUNT_EMAIL_ALREADY_USED";

  constructor() {
    super("Cet email est deja utilise.");
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = "AUTH_INVALID_CREDENTIALS";

  constructor() {
    super("Email ou mot de passe invalide.");
  }
}

export class InvalidAccountTypeSelectionError extends DomainError {
  readonly code = "AUTH_INVALID_ACCOUNT_TYPE_SELECTION";

  constructor() {
    super("Selection de type de compte invalide.");
  }
}

export class InvalidPaymentDetailsError extends DomainError {
  readonly code = "PAYMENT_INVALID_DETAILS";

  constructor(message = "Informations de paiement invalides.") {
    super(message);
  }
}

