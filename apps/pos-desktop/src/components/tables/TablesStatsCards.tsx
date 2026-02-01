import { Shad, Icon } from "@repo/ui";
import type { TableStats } from "@/dto/tables.dto";

interface TablesStatsCardsProps {
    stats: TableStats | undefined;
}

/**
 * Stats cards grid for the Tables page
 * Displays total, available, occupied, and reserved table counts
 */
export function TablesStatsCards({ stats }: TablesStatsCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Tables Card */}
            <Shad.Card className="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <Shad.CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">
                                Total Tables
                            </p>
                            <p className="text-3xl font-bold">{stats?.total || 0}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <Icon name="LayoutGrid" className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                        </div>
                    </div>
                </Shad.CardContent>
            </Shad.Card>

            {/* Available Tables Card */}
            <Shad.Card className="bg-linear-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                <Shad.CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                                Available
                            </p>
                            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                                {stats?.available || 0}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                            <Icon name="CircleCheck" className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                        </div>
                    </div>
                </Shad.CardContent>
            </Shad.Card>

            {/* Occupied Tables Card */}
            <Shad.Card className="bg-linear-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                <Shad.CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                                Occupied
                            </p>
                            <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                                {stats?.occupied || 0}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center">
                            <Icon name="Users" className="h-6 w-6 text-red-600 dark:text-red-300" />
                        </div>
                    </div>
                </Shad.CardContent>
            </Shad.Card>

            {/* Reserved Tables Card */}
            <Shad.Card className="bg-linear-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                <Shad.CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                                Reserved
                            </p>
                            <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                                {stats?.reserved || 0}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                            <Icon name="Clock" className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                        </div>
                    </div>
                </Shad.CardContent>
            </Shad.Card>
        </div>
    );
}
