import { pdf } from '@react-pdf/renderer';
import { DebtsReportPdf, DebtsReportProps } from '../debts/DebtsReportPdf';

/**
 * Generates a Blob for the Debts Report PDF.
 * This function should be called from the UI layer (e.g., inside a button click handler).
 * The resulting Blob can be used to create an object URL for preview or download.
 */
export const exportDebtsReportPdf = async (data: DebtsReportProps): Promise<Blob> => {
    const blob = await pdf(<DebtsReportPdf {...data} />).toBlob();
    return blob;
};
