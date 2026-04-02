export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) throw new Error("Money cents must be integer.");
    return new Money(cents);
  }

  static fromEuros(euros: number): Money {
    return Money.fromCents(Math.round(euros * 100));
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  multiply(factor: number): Money {
    return Money.fromCents(Math.round(this.cents * factor));
  }
}

