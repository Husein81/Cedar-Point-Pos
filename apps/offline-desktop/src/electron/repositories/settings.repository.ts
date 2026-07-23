import type Database from "better-sqlite3";
import type { Settings } from "../../shared/models";

type SettingsRow = Settings & { id: number };

export class SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  get(): Settings {
    const row = this.db
      .prepare<[], SettingsRow>("SELECT * FROM settings WHERE id = 1")
      .get();

    if (!row) {
      // Migration seeds the row; reaching here means a corrupted DB.
      throw new Error("Settings row missing");
    }

    const { id: _id, ...settings } = row;
    return settings;
  }

  update(patch: Partial<Settings>): Settings {
    const current = this.get();
    const next: Settings = { ...current, ...patch };

    this.db
      .prepare(
        `UPDATE settings SET
           businessName = @businessName, phone = @phone, email = @email, address = @address,
           currencyCode = @currencyCode, currencySymbol = @currencySymbol,
           receiptFooter = @receiptFooter, taxRate = @taxRate, logoPath = @logoPath,
           invoicePrefix = @invoicePrefix, nextInvoiceNumber = @nextInvoiceNumber,
           printerName = @printerName, receiptWidthMm = @receiptWidthMm, theme = @theme
         WHERE id = 1`,
      )
      .run(next);

    return next;
  }

  // Atomic invoice-number claim: returns the number to use and increments.
  claimNextInvoiceNumber(): { prefix: string; number: number } {
    const claim = this.db.transaction(() => {
      const current = this.get();
      this.db
        .prepare("UPDATE settings SET nextInvoiceNumber = nextInvoiceNumber + 1 WHERE id = 1")
        .run();
      return { prefix: current.invoicePrefix, number: current.nextInvoiceNumber };
    });
    return claim();
  }
}
