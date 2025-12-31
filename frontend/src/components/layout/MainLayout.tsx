import { type ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
    children: ReactNode;
    currentPage: string;
    onPageChange: (page: string) => void;
}

export function MainLayout({
    children,
    currentPage,
    onPageChange,
}: MainLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Sidebar */}
            <Sidebar
                currentPage={currentPage}
                onPageChange={onPageChange}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">{children}</div>
            </main>
        </div>
    );
}
