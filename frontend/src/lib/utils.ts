import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "N/A";
    try {
        // Handle date strings with hyphens in time (e.g., 2024-02-20T14-00-00Z)
        // Convert to standard ISO format with colons
        let normalizedDate = dateString;

        // Pattern: 2024-02-20T14-00-00Z -> 2024-02-20T14:00:00Z
        const timeWithHyphens = /T(\d{2})-(\d{2})-(\d{2})(Z?)$/;
        if (timeWithHyphens.test(dateString)) {
            normalizedDate = dateString.replace(timeWithHyphens, 'T$1:$2:$3$4');
        }

        const date = new Date(normalizedDate);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            // If still invalid, try to extract just the date part
            const datePart = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
            if (datePart) {
                const simpleDate = new Date(datePart[1]);
                if (!isNaN(simpleDate.getTime())) {
                    return simpleDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    });
                }
            }
            return dateString;
        }

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return dateString;
    }
}

export function truncate(str: string, length: number): string {
    if (!str) return "";
    return str.length > length ? str.substring(0, length) + "..." : str;
}
