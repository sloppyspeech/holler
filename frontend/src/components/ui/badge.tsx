import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border text-[12px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2",
                {
                    "border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]":
                        variant === "default",
                    "border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]":
                        variant === "secondary",
                    "border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]":
                        variant === "destructive",
                    "text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.1)]": variant === "outline",
                    "border-transparent bg-[hsl(var(--success-bg)/0.2)] text-[hsl(var(--success-bg)/0.8)] dark:bg-[hsl(var(--success-bg)/0.3)] dark:text-[hsl(var(--success-bg))]": variant === "success",
                },
                className
            )}
            style={{
                padding: "3px 12px", // Spacious yet balanced
                display: "inline-flex",
                alignItems: "center",
                lineHeight: "1.4",
                height: "fit-content",
                fontFamily: "'Inter', sans-serif"
            }}
            {...props}
        />
    );
}

export { Badge };
