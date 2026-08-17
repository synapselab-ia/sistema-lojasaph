import { DomainError } from "./domain-error";

const SCALE = 1000;

export class Quantity {
  private constructor(readonly milliunits: number) {
    if (!Number.isSafeInteger(milliunits)) {
      throw new DomainError("INVALID_QUANTITY", "Quantity must use safe integer milliunits.");
    }
  }

  static zero(): Quantity {
    return new Quantity(0);
  }

  static fromMilliunits(milliunits: number): Quantity {
    return new Quantity(milliunits);
  }

  static fromDecimal(value: string): Quantity {
    const normalized = value.trim().replace(",", ".");
    if (!/^-?\d+(\.\d{1,3})?$/.test(normalized)) {
      throw new DomainError("INVALID_QUANTITY", `Invalid quantity: ${value}`);
    }

    const negative = normalized.startsWith("-");
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [whole, fraction = ""] = unsigned.split(".");
    const milliunits = Number(whole) * SCALE + Number(fraction.padEnd(3, "0"));

    if (!Number.isSafeInteger(milliunits)) {
      throw new DomainError("INVALID_QUANTITY", "Quantity exceeds safe integer range.");
    }

    return new Quantity(negative ? -milliunits : milliunits);
  }

  add(other: Quantity): Quantity {
    return new Quantity(this.milliunits + other.milliunits);
  }

  subtract(other: Quantity): Quantity {
    return new Quantity(this.milliunits - other.milliunits);
  }

  isPositive(): boolean {
    return this.milliunits > 0;
  }

  isZero(): boolean {
    return this.milliunits === 0;
  }

  isNegative(): boolean {
    return this.milliunits < 0;
  }

  isLessThan(other: Quantity): boolean {
    return this.milliunits < other.milliunits;
  }

  toDecimal(): string {
    const absolute = Math.abs(this.milliunits);
    const whole = Math.floor(absolute / SCALE);
    const fraction = String(absolute % SCALE).padStart(3, "0").replace(/0+$/, "");
    return `${this.milliunits < 0 ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
  }
}
