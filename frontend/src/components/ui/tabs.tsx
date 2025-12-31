import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const tabsListStyle: React.CSSProperties = {
    display: "inline-flex",
    height: "44px",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    backgroundColor: "#f1f5f9",
    padding: "4px",
    gap: "4px",
};

const tabsTriggerBaseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
};

const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, style, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        style={{ ...tabsListStyle, ...style }}
        className={className}
        {...props}
    />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, style, ...props }, ref) => {
    return (
        <TabsPrimitive.Trigger
            ref={ref}
            style={{
                ...tabsTriggerBaseStyle,
                ...style,
            }}
            className={cn(
                // Base colors from tailwind to avoid inline style persistence
                "bg-transparent text-slate-500",
                // Hover state
                "hover:bg-slate-200 hover:text-slate-700",
                // Active state
                "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm",
                className
            )}
            {...props}
        />
    );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, style, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        style={{ marginTop: "8px", ...style }}
        className={className}
        {...props}
    />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
