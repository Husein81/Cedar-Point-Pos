import { StyleSheet } from '@react-pdf/renderer';

export const pdfColors = {
    text: '#111827', // gray-900
    textLight: '#6B7280', // gray-500
    border: '#E5E7EB', // gray-200
    headerBg: '#F9FAFB', // gray-50
    primary: '#000000',
};

export const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 9,
        fontFamily: 'Helvetica',
        color: pdfColors.text,
        flexDirection: 'column',
    },
    // Typography
    title: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 10,
        color: pdfColors.textLight,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginTop: 15,
        marginBottom: 8,
        textTransform: 'uppercase',
    },

    // Header/Footer
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: pdfColors.primary,
        paddingBottom: 10,
    },
    metaContainer: {
        alignItems: 'flex-end',
    },
    metaItem: {
        fontSize: 8,
        color: pdfColors.textLight,
        marginBottom: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: pdfColors.border,
        paddingTop: 8,
    },
    pageNumber: {
        fontSize: 8,
        color: pdfColors.textLight,
    },

    // Tables
    tableContainer: {
        width: '100%',
        marginVertical: 10,
        borderWidth: 1,
        borderColor: pdfColors.border,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: pdfColors.border,
        minHeight: 24,
        alignItems: 'center',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: pdfColors.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: pdfColors.border,
        alignItems: 'center',
        minHeight: 24,
    },
    tableCell: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        fontSize: 8,
    },
    tableCellHeader: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
    },

    // Summary
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: pdfColors.headerBg,
        padding: 15,
        marginBottom: 20,
        borderRadius: 4,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 8,
        color: pdfColors.textLight,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: pdfColors.text,
    },

    // Helpers
    textRight: { textAlign: 'right' },
    textCenter: { textAlign: 'center' },
    textBold: { fontFamily: 'Helvetica-Bold' },
});
