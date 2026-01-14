import { pdf } from '@react-pdf/renderer';
import { TopProductsReportPdf, TopProductsReportProps } from '../products/TopProductsReportPdf';

/**
 * Generates a Blob for the Top Products Report PDF.
 * This function should be called from the UI layer (e.g., inside a button click handler).
 * The resulting Blob can be used to create an object URL for preview or download.
 */
export const exportTopProductsReportPdf = async (data: TopProductsReportProps): Promise<Blob> => {
    const blob = await pdf(<TopProductsReportPdf {...data} />).toBlob();
    return blob;
};
