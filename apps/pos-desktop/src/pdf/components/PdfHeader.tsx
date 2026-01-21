import { View, Text } from '@react-pdf/renderer';
import { styles } from './PdfStyles';

interface PdfHeaderProps {
    title: string;
    subtitle?: string;
    branchName?: string;
    dateRange?: string;
}

export const PdfHeader: React.FC<PdfHeaderProps> = ({
    title,
    subtitle,
    branchName,
    dateRange,
}) => {
    return (
        <View style={styles.headerContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            <View style={styles.metaContainer}>
                <Text style={styles.metaItem}>
                    {branchName ? `Branch: ${branchName}` : 'All Branches'}
                </Text>
                <Text style={styles.metaItem}>{dateRange}</Text>
            </View>
        </View>
    );
};
