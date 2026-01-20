import { pdf } from '@react-pdf/renderer';
import { FinancialsReportPdf } from '../financials/FinancialsReportPdf';
import type { FinancialsReportProps } from '../financials/FinancialsReportPdf';

export async function exportFinancialsReportPdf(props: FinancialsReportProps) {
    const blob = await pdf(<FinancialsReportPdf {...props} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financials-report-${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
}
