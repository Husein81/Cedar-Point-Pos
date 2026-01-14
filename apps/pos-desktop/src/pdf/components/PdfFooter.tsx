import { View, Text } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { format } from 'date-fns';

export const PdfFooter: React.FC = () => {
    return (
        <View style={styles.footer} fixed>
            <Text>{`Generated on ${format(new Date(), 'PP p')}`}</Text>
            <Text render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
            )} />
        </View>
    );
};
