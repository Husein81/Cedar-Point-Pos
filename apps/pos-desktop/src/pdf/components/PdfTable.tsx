import { View, Text } from '@react-pdf/renderer';
import { styles } from './PdfStyles';

interface Column {
    header: string;
    accessor: string;
    width?: string; // Percentage string e.g., "20%"
    align?: 'left' | 'center' | 'right';
    format?: (value: any) => string;
}

interface PdfTableProps {
    data: any[];
    columns: Column[];
}

export const PdfTable: React.FC<PdfTableProps> = ({ data, columns }) => {
    return (
        <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader} fixed>
                {columns.map((col, index) => (
                    <View
                        key={`header-${index}`}
                        style={[
                            styles.tableCell, // Base cell style usually has flex:1
                            col.width ? { flex: '0 0 auto', width: col.width } : { flex: 1 },
                        ]}
                    >
                        <Text style={[
                            styles.tableCellHeader,
                            col.align === 'right' ? styles.textRight : col.align === 'center' ? styles.textCenter : {}
                        ]}>
                            {col.header}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Table Body */}
            {data.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.tableRow} wrap={false}>
                    {columns.map((col, colIndex) => {
                        const value = row[col.accessor];
                        const displayValue = col.format ? col.format(value) : value;

                        return (
                            <View
                                key={`cell-${rowIndex}-${colIndex}`}
                                style={[
                                    styles.tableCell,
                                    col.width ? { flex: '0 0 auto', width: col.width } : { flex: 1 },
                                ]}
                            >
                                <Text style={[
                                    { fontSize: 8 },
                                    col.align === 'right' ? styles.textRight : col.align === 'center' ? styles.textCenter : {}
                                ]}>
                                    {displayValue}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};
