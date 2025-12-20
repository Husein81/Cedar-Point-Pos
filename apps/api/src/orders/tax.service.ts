import { Injectable } from '@nestjs/common';

@Injectable()
export class TaxService {
  /**
   * Calculates tax amount for a given taxable amount and tax rate.
   * Rounds the result to 2 decimal places.
   *
   * @param taxableAmount The amount to apply tax to
   * @param taxRate The tax rate percentage (e.g., 10 for 10%)
   * @returns The calculated tax amount
   */
  calculateItemTax(taxableAmount: number, taxRate: number): number {
    return this.round(taxableAmount * (taxRate / 100));
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
