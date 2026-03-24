import { Document, Page } from "@react-pdf/renderer";
import { styles } from "./PdfStyles";
import { PdfFooter } from "./PdfFooter";
import { PdfHeader } from "./PdfHeader";

interface PdfDocumentProps {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  headerData?: {
    title: string;
    subtitle?: string;
    branchName?: string;
    dateRange?: string;
  };
}

export const PdfDocument: React.FC<PdfDocumentProps> = ({
  title = "Report",
  author = "Cedar Point POS",
  subject = "Exported Report",
  keywords = "report, cedarpoint, pos",
  children,
  showHeader = true,
  showFooter = true,
  headerData,
}) => {
  return (
    <Document
      title={title}
      author={author}
      subject={subject}
      keywords={keywords}
    >
      <Page size="A4" style={styles.page}>
        {showHeader && headerData && (
          <PdfHeader
            title={headerData.title}
            subtitle={headerData.subtitle}
            branchName={headerData.branchName}
            dateRange={headerData.dateRange}
          />
        )}

        {children}

        {showFooter && <PdfFooter />}
      </Page>
    </Document>
  );
};
