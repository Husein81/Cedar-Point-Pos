import { pdf } from '@react-pdf/renderer';
import { SalesReportPdf, SalesReportProps } from '../sales/SalesReportPdf';

/**
 * Generates a Blob for the Sales Report PDF.
 * This function should be called from the UI layer (e.g., inside a button click handler).
 * The resulting Blob can be used to create an object URL for preview or download.
 */
export const exportSalesReportPdf = async (data: SalesReportProps): Promise<Blob> => {
    const blob = await pdf(<SalesReportPdf { ...data } />).toBlob();
    return blob;
};
