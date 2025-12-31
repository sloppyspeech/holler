import { useState, useEffect } from "react";
import { Search, Play, ExternalLink, CheckCircle, Clock, Cpu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    fetchFiles,
    fetchFile,
    searchFiles,
    fetchModels,
    fetchModelStatus,
    type FileMetadata,
    type FileDetail,
    type ModelInfo,
} from "@/services/api";
import { formatDate } from "@/lib/utils";

const styles = {
    container: {
        display: "flex",
        height: "100%",
    } as React.CSSProperties,
    sidebar: {
        width: "340px",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column" as const,
        backgroundColor: "white",
    } as React.CSSProperties,
    sidebarHeader: {
        padding: "20px",
        borderBottom: "1px solid #e2e8f0",
    } as React.CSSProperties,
    sidebarTitle: {
        fontSize: "18px",
        fontWeight: 600,
        color: "#1e293b",
        margin: "0 0 16px 0",
    } as React.CSSProperties,
    searchWrapper: {
        position: "relative" as const,
    } as React.CSSProperties,
    searchIcon: {
        position: "absolute" as const,
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#94a3b8",
    } as React.CSSProperties,
    fileList: {
        flex: 1,
        overflow: "auto",
        padding: "12px",
    } as React.CSSProperties,
    fileCard: (isSelected: boolean) => ({
        padding: "16px",
        marginBottom: "10px",
        borderRadius: "10px",
        border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0",
        backgroundColor: isSelected ? "#eff6ff" : "white",
        cursor: "pointer",
        transition: "all 0.2s",
    }) as React.CSSProperties,
    fileCardInner: {
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
    } as React.CSSProperties,
    fileIcon: {
        width: "40px",
        height: "40px",
        borderRadius: "8px",
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    } as React.CSSProperties,
    fileTitle: {
        fontSize: "14px",
        fontWeight: 500,
        color: "#1e293b",
        margin: "0 0 10px 0",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
    } as React.CSSProperties,
    badgeRow: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "8px",
        marginBottom: "8px",
    } as React.CSSProperties,
    fileDate: {
        fontSize: "12px",
        color: "#94a3b8",
        margin: 0,
    } as React.CSSProperties,
    mainContent: {
        flex: 1,
        backgroundColor: "#f8fafc",
    } as React.CSSProperties,
    contentHeader: {
        padding: "24px 32px",
        backgroundColor: "white",
        borderBottom: "1px solid #e2e8f0",
    } as React.CSSProperties,
    contentTitle: {
        fontSize: "22px",
        fontWeight: 700,
        color: "#1e293b",
        margin: "0 0 12px 0",
    } as React.CSSProperties,
    metaRow: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap" as const,
    } as React.CSSProperties,
    modelSelector: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: "#f1f5f9",
        padding: "4px 12px",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
    } as React.CSSProperties,
    select: {
        border: "none",
        backgroundColor: "transparent",
        fontSize: "13px",
        fontWeight: 500,
        color: "#475569",
        cursor: "pointer",
        outline: "none",
    } as React.CSSProperties,
    contentBody: {
        flex: 1,
        overflow: "hidden",
        padding: "24px",
    } as React.CSSProperties,
    contentCard: {
        backgroundColor: "white",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
        padding: "24px",
    } as React.CSSProperties,
    emptyState: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
    } as React.CSSProperties,
    emptyIcon: {
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        backgroundColor: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 16px",
    } as React.CSSProperties,
};

export function AllSummariesPage() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileDetail | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("summary");
    const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [filesData, modelsData, statusData] = await Promise.all([
                fetchFiles(),
                fetchModels(),
                fetchModelStatus()
            ]);
            setFiles(filesData);
            setAvailableModels(modelsData);
            setSelectedModel(statusData.default_app_model);
            setError(null);
        } catch (err) {
            setError("Failed to load data. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            try {
                const results = await searchFiles(query);
                setFiles(results as unknown as FileMetadata[]);
            } catch (err) {
                console.error("Search failed:", err);
            }
        } else {
            const data = await fetchFiles();
            setFiles(data);
        }
    };

    const handleSelectFile = async (id: number) => {
        try {
            const detail = await fetchFile(id);
            setSelectedFile(detail);
            setActiveTab("summary"); // Reset to summary when switching files
        } catch (err) {
            console.error("Failed to load file:", err);
        }
    };

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", backgroundColor: "#f8fafc" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        border: "4px solid #3b82f6",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px",
                    }} />
                    <p style={{ fontSize: "14px", color: "#64748b" }}>Loading summaries...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Left Panel - File List */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <h2 style={styles.sidebarTitle}>All Summaries</h2>
                    <div style={styles.searchWrapper}>
                        <Search size={16} style={styles.searchIcon} />
                        <Input
                            placeholder="Search summaries..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{ paddingLeft: "36px" }}
                        />
                    </div>
                </div>

                <div style={styles.fileList}>
                    {error ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#ef4444", fontSize: "14px" }}>{error}</div>
                    ) : files.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>No summaries found</div>
                    ) : (
                        files.map((file) => (
                            <div
                                key={file.id}
                                onClick={() => handleSelectFile(file.id)}
                                style={styles.fileCard(selectedFile?.id === file.id)}
                            >
                                <div style={styles.fileCardInner}>
                                    <div style={styles.fileIcon}>
                                        <Play size={16} style={{ color: "white" }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={styles.fileTitle}>{file.video_title || file.actual_file_name}</h3>
                                        <div style={styles.badgeRow}>
                                            <Badge variant={file.site_name === "youtube" ? "destructive" : "secondary"}>
                                                {file.site_name}
                                            </Badge>
                                            {file.has_embedding ? (
                                                <Badge variant="success">
                                                    <CheckCircle size={10} style={{ marginRight: "4px" }} />
                                                    Embedded
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    <Clock size={10} style={{ marginRight: "4px" }} />
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                        <p style={styles.fileDate}>{formatDate(file.extract_date)}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel - Content Viewer */}
            <div style={styles.mainContent}>
                {selectedFile ? (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        {/* Header */}
                        <div style={styles.contentHeader}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                        <h1 style={{ ...styles.contentTitle, margin: 0 }}>{selectedFile.video_title || selectedFile.actual_file_name}</h1>
                                        <div style={styles.modelSelector}>
                                            <Cpu size={14} style={{ color: "#64748b" }} />
                                            <select
                                                style={styles.select}
                                                value={selectedModel}
                                                onChange={(e) => setSelectedModel(e.target.value)}
                                            >
                                                {availableModels.map(m => (
                                                    <option key={m.name} value={m.name}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={styles.metaRow}>
                                        <Badge variant="destructive">{selectedFile.site_name}</Badge>
                                        <span style={{ fontSize: "14px", color: "#64748b" }}>{formatDate(selectedFile.extract_date)}</span>
                                        {selectedFile.has_embedding && (
                                            <span style={{ fontSize: "14px", color: "#16a34a", display: "flex", alignItems: "center", gap: "6px" }}>
                                                <CheckCircle size={14} />
                                                Vectorized with {selectedFile.model_used}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveTab("original");
                                    }}
                                    style={{ color: "#3b82f6", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", textDecoration: "none", flexShrink: 0, marginLeft: "20px" }}
                                >
                                    <ExternalLink size={14} />
                                    Open Original
                                </a>
                            </div>
                        </div>

                        {/* Content Tabs */}
                        <div style={{ flex: 1, overflow: "hidden", padding: "24px" }}>
                            <Tabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                                style={{ height: "100%", display: "flex", flexDirection: "column" }}
                            >
                                <TabsList style={{ marginBottom: "16px" }}>
                                    <TabsTrigger value="summary">Summary</TabsTrigger>
                                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                                    <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
                                    <TabsTrigger value="takeaways">Key Takeaways</TabsTrigger>
                                    <TabsTrigger value="original">Original File</TabsTrigger>
                                </TabsList>

                                <div style={{ flex: 1, overflow: "auto" }}>
                                    <TabsContent value="summary" style={{ margin: 0 }}>
                                        <div style={styles.contentCard}>
                                            <div style={{ fontSize: "14px", lineHeight: 1.8, color: "#374151" }}>
                                                <ReactMarkdown>{selectedFile.summary || "No summary available"}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="transcript" style={{ margin: 0 }}>
                                        <div style={styles.contentCard}>
                                            <div style={{ fontSize: "14px", lineHeight: 1.8, color: "#374151" }}>
                                                <ReactMarkdown>{selectedFile.transcript || "No transcript available"}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="mindmap" style={{ margin: 0 }}>
                                        <div style={styles.contentCard}>
                                            <div style={{ fontSize: "14px", lineHeight: 1.8, color: "#374151" }}>
                                                <ReactMarkdown>{selectedFile.mind_map || "No mind map available"}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="takeaways" style={{ margin: 0 }}>
                                        <div style={styles.contentCard}>
                                            <div style={{ fontSize: "14px", lineHeight: 1.8, color: "#374151" }}>
                                                <ReactMarkdown>{selectedFile.key_takeaway || "No key takeaways available"}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="original" style={{ margin: 0 }}>
                                        <div style={styles.contentCard}>
                                            <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#374151", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                                                {selectedFile.raw_content || "No original content available"}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={{ textAlign: "center" }}>
                            <div style={styles.emptyIcon}>
                                <Play size={28} style={{ color: "#94a3b8" }} />
                            </div>
                            <h3 style={{ fontSize: "16px", fontWeight: 500, color: "#475569", marginBottom: "6px" }}>Select a Summary</h3>
                            <p style={{ fontSize: "14px", color: "#94a3b8" }}>Choose a summary from the list to view its content</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
