import { pdf } from '@react-pdf/renderer';
import { InventoryMovementsReportPdf, InventoryMovementsReportProps } from '../inventory/InventoryMovementsReportPdf';

/**
 * Generates a Blob for the Inventory Movements Report PDF.
 * This function should be called from the UI layer (e.g., inside a button click handler).
 * The resulting Blob can be used to create an object URL for preview or download.
 */
export const exportInventoryMovementsReportPdf = async (data: InventoryMovementsReportProps): Promise<Blob> => {
    const blob = await pdf(<InventoryMovementsReportPdf {...data} />).toBlob();
    return blob;
};
