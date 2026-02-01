import { Button, Icon } from "@repo/ui";
import Heading from "@/components/heading";

interface TablesPageHeaderProps {
    onRefresh: () => void;
    onAddTable: () => void;
}

/**
 * Header section for the Tables page
 * Contains page title, subtitle, and action buttons
 */
export function TablesPageHeader({ onRefresh, onAddTable }: TablesPageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <Heading
                title="Tables"
                subtitle="Manage your restaurant tables and floor layouts"
            />

            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onRefresh}>
                    <Icon name="RefreshCw" className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
                <Button size="sm" onClick={onAddTable}>
                    <Icon name="Plus" className="h-4 w-4 mr-2" />
                    Add Table
                </Button>
            </div>
        </div>
    );
}
