/**
 * PDF Formatter Utilities
 * Standalone formatters to avoid dependency coupling with UI components
 */

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(value);
};

export const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export const formatDateTime = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};
