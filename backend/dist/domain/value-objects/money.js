export class Money {
    cents;
    constructor(cents) {
        this.cents = cents;
    }
    static fromCents(cents) {
        if (!Number.isInteger(cents))
            throw new Error("Money cents must be integer.");
        return new Money(cents);
    }
    static fromEuros(euros) {
        return Money.fromCents(Math.round(euros * 100));
    }
    add(other) {
        return Money.fromCents(this.cents + other.cents);
    }
    multiply(factor) {
        return Money.fromCents(Math.round(this.cents * factor));
    }
}
