import { DomainError } from "./domain-error";

export class Money {
  private constructor(readonly cents: number) {
    if (!Number.isSafeInteger(cents)) {
      throw new DomainError("INVALID_MONEY", "Money must use safe integer cents.");
    }
  }

  static zero(): Money {
    return new Money(0);
  }

  static fromCents(cents: number): Money {
    return new Money(cents);
  }

  static fromDecimal(value: string): Money {
    const normalized = value.trim().replace(",", ".");

    if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
      throw new DomainError("INVALID_MONEY", `Invalid decimal money value: ${value}`);
    }

    const negative = normalized.startsWith("-");
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [whole, fraction = ""] = unsigned.split(".");
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

    if (!Number.isSafeInteger(cents)) {
      throw new DomainError("INVALID_MONEY", "Money exceeds safe integer range.");
    }

    return new Money(negative ? -cents : cents);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  toDecimal(): string {
    const absolute = Math.abs(this.cents);
    const whole = Math.floor(absolute / 100);
    const fraction = String(absolute % 100).padStart(2, "0");
    return `${this.cents < 0 ? "-" : ""}${whole}.${fraction}`;
  }
}
