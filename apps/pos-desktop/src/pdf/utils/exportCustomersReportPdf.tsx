import { pdf } from '@react-pdf/renderer';
import { CustomersReportPdf, CustomersReportProps } from '../customers/CustomersReportPdf';

/**
 * Generates a Blob for the Customers Report PDF.
 * This function should be called from the UI layer (e.g., inside a button click handler).
 * The resulting Blob can be used to create an object URL for preview or download.
 */
export const exportCustomersReportPdf = async (data: CustomersReportProps): Promise<Blob> => {
    const blob = await pdf(<CustomersReportPdf {...data} />).toBlob();
    return blob;
};
