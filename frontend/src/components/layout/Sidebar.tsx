import { cn } from "@/lib/utils";
import {
    FileText,
    MessageSquare,
    Settings,
    Cpu,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
    currentPage: string;
    onPageChange: (page: string) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

const navItems = [
    { id: "summaries", label: "All Summaries", icon: FileText },
    { id: "chat", label: "Summary Chat", icon: MessageSquare },
    { id: "admin", label: "Admin", icon: Settings },
    { id: "models", label: "Manage Models", icon: Cpu },
];

export function Sidebar({
    currentPage,
    onPageChange,
    collapsed,
    onToggleCollapse,
}: SidebarProps) {
    return (
        <div
            className={cn(
                "flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 relative",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Header */}
            <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg">
                    H
                </div>
                {!collapsed && (
                    <div className="animate-fade-in">
                        <h1 className="font-bold text-lg gradient-text">Holler</h1>
                        <p className="text-xs text-slate-400">Summary Manager</p>
                    </div>
                )}
            </div>

            <Separator className="bg-slate-700/50" />

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                        <Button
                            key={item.id}
                            variant="ghost"
                            onClick={() => onPageChange(item.id)}
                            className={cn(
                                "w-full justify-start gap-3 h-11 transition-all duration-200",
                                collapsed ? "px-3" : "px-4",
                                isActive
                                    ? "bg-white/10 text-white hover:bg-white/15"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon
                                size={20}
                                className={cn(
                                    "transition-colors",
                                    isActive && "text-blue-400"
                                )}
                            />
                            {!collapsed && (
                                <span className="animate-fade-in">{item.label}</span>
                            )}
                        </Button>
                    );
                })}
            </nav>

            {/* Collapse Button */}
            <div className="p-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleCollapse}
                    className="w-full h-10 text-slate-400 hover:text-white hover:bg-white/5"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </Button>
            </div>

            {/* Footer */}
            {!collapsed && (
                <div className="p-4 text-xs text-slate-500 animate-fade-in">
                    <p>© 2025 Holler</p>
                    <p>RAG-powered summaries</p>
                </div>
            )}
        </div>
    );
}
