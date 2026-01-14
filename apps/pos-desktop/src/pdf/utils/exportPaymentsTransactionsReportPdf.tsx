import { pdf } from '@react-pdf/renderer';
import { PaymentsTransactionsReportPdf, PaymentsTransactionsReportProps } from '../payments/PaymentsTransactionsReportPdf';

/**
 * Generates a Blob for the Payments Transactions Report PDF.
 * This function should be called from the UI layer (e.g., inside a button click handler).
 * The resulting Blob can be used to create an object URL for preview or download.
 */
export const exportPaymentsTransactionsReportPdf = async (data: PaymentsTransactionsReportProps): Promise<Blob> => {
    const blob = await pdf(<PaymentsTransactionsReportPdf {...data} />).toBlob();
    return blob;
};
