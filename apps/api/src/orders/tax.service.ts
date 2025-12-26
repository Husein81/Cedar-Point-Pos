import { Injectable } from '@nestjs/common';

@Injectable()
export class TaxService {
  calculateItemTax(taxableAmount: number, taxRate: number): number {
    return this.round(taxableAmount * (taxRate / 100));
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
