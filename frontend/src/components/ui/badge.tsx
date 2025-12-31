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
                    "border-transparent bg-slate-900 text-white":
                        variant === "default",
                    "border-transparent bg-slate-100 text-slate-900":
                        variant === "secondary",
                    "border-transparent bg-red-100 text-red-700 border-red-200":
                        variant === "destructive",
                    "text-slate-600 border-slate-200": variant === "outline",
                    "border-transparent bg-green-100 text-green-700 border-green-200": variant === "success",
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
