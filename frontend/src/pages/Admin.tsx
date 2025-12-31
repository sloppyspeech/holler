import { useState, useEffect } from "react";
import {
    FolderOpen,
    Upload,
    Trash2,
    RefreshCw,
    CheckCircle,
    Clock,
    Database,
    Zap,
    Search,
    X,
    Terminal,
    AlertTriangle,
    Info,
    Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    fetchFiles,
    deleteFile,
    deleteEmbedding,
    deleteAllEmbeddings,
    resetEmbeddings,
    recalculateEmbedding,
    batchProcess,
    vectorizeAll,
    uploadFile,
    fetchLogs,
    fetchDebugStatus,
    clearLogs,
    type FileMetadata,
    type LogEntry,
} from "@/services/api";
import { formatDate } from "@/lib/utils";

const styles = {
    container: {
        height: "100%",
        overflow: "auto",
        backgroundColor: "#f8fafc",
        padding: "32px",
    } as React.CSSProperties,
    wrapper: {
        maxWidth: "1000px",
        margin: "0 auto",
    } as React.CSSProperties,
    header: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        marginBottom: "32px",
    } as React.CSSProperties,
    headerIcon: {
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)",
        flexShrink: 0,
    } as React.CSSProperties,
    headerTitle: {
        fontSize: "24px",
        fontWeight: 700,
        color: "#1e293b",
        margin: 0,
    } as React.CSSProperties,
    headerSubtitle: {
        fontSize: "14px",
        color: "#64748b",
        margin: 0,
    } as React.CSSProperties,
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: "32px",
    } as React.CSSProperties,
    statCard: (color: string) => ({
        background: color,
        borderRadius: "12px",
        padding: "24px",
        color: "white",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    }) as React.CSSProperties,
    statLabel: {
        fontSize: "12px",
        opacity: 0.85,
        margin: "0 0 8px 0",
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
        fontWeight: 500,
    } as React.CSSProperties,
    statValue: {
        fontSize: "36px",
        fontWeight: 700,
        margin: 0,
        lineHeight: 1,
    } as React.CSSProperties,
    card: {
        backgroundColor: "white",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
        marginBottom: "16px",
    } as React.CSSProperties,
    cardHeader: {
        padding: "20px 24px 16px 24px",
    } as React.CSSProperties,
    cardTitle: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "16px",
        fontWeight: 600,
        color: "#1e293b",
        margin: "0 0 6px 0",
    } as React.CSSProperties,
    cardDescription: {
        fontSize: "14px",
        color: "#64748b",
        margin: 0,
    } as React.CSSProperties,
    cardContent: {
        padding: "0 24px 24px 24px",
    } as React.CSSProperties,
    uploadZone: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "120px",
        border: "2px dashed #e2e8f0",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.2s",
    } as React.CSSProperties,
    table: {
        width: "100%",
        borderCollapse: "collapse" as const,
        fontSize: "14px",
    } as React.CSSProperties,
    tableHeader: {
        textAlign: "left" as const,
        padding: "12px 16px",
        fontWeight: 500,
        color: "#64748b",
        backgroundColor: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
    } as React.CSSProperties,
    tableCell: {
        padding: "14px 16px",
        borderBottom: "1px solid #f1f5f9",
    } as React.CSSProperties,
    searchWrapper: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "16px",
    } as React.CSSProperties,
    logEntry: {
        padding: "10px 14px",
        borderBottom: "1px solid #f1f5f9",
        fontFamily: "monospace",
        fontSize: "12px",
    } as React.CSSProperties,
    logLevel: (level: string) => {
        const colors: Record<string, { bg: string; text: string }> = {
            DEBUG: { bg: "#f0fdf4", text: "#16a34a" },
            INFO: { bg: "#eff6ff", text: "#2563eb" },
            WARNING: { bg: "#fef9c3", text: "#ca8a04" },
            ERROR: { bg: "#fef2f2", text: "#dc2626" },
        };
        return colors[level] || { bg: "#f1f5f9", text: "#64748b" };
    },
};

export function AdminPage() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [filteredFiles, setFilteredFiles] = useState<FileMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [directoryPath, setDirectoryPath] = useState("");
    const [processingStatus, setProcessingStatus] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [recalculatingFiles, setRecalculatingFiles] = useState<Set<number>>(new Set());

    // Logs state
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [debugEnabled, setDebugEnabled] = useState(false);
    const [logsLoading, setLogsLoading] = useState(false);

    useEffect(() => {
        loadFiles();
        loadDebugStatus();
    }, []);

    useEffect(() => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            setFilteredFiles(
                files.filter(
                    (f) =>
                        f.video_title?.toLowerCase().includes(query) ||
                        f.actual_file_name.toLowerCase().includes(query) ||
                        f.site_name.toLowerCase().includes(query)
                )
            );
        } else {
            setFilteredFiles(files);
        }
    }, [searchQuery, files]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            const data = await fetchFiles();
            setFiles(data);
            setFilteredFiles(data);
        } catch (error) {
            console.error("Failed to load files:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadDebugStatus = async () => {
        try {
            const status = await fetchDebugStatus();
            setDebugEnabled(status.debug_enabled);
        } catch (error) {
            console.error("Failed to load debug status:", error);
        }
    };

    const loadLogs = async () => {
        try {
            setLogsLoading(true);
            const response = await fetchLogs(200);
            setLogs(response.logs);
            setDebugEnabled(response.debug_enabled);
        } catch (error) {
            console.error("Failed to load logs:", error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleClearLogs = async () => {
        try {
            await clearLogs();
            setLogs([]);
        } catch (error) {
            console.error("Failed to clear logs:", error);
        }
    };

    const handleBatchProcess = async () => {
        if (!directoryPath.trim()) return;
        try {
            setProcessing(true);
            setProcessingStatus("Processing files...");
            const result = await batchProcess(directoryPath);
            setProcessingStatus(
                `✅ ${result.message}. Processed: ${result.processed_count}, Failed: ${result.failed_count}`
            );
            loadFiles();
        } catch (error) {
            setProcessingStatus("❌ Failed to process directory");
        } finally {
            setProcessing(false);
        }
    };

    const handleVectorizeAll = async () => {
        try {
            setProcessing(true);
            setProcessingStatus("Generating embeddings...");
            const result = await vectorizeAll();
            setProcessingStatus(
                `✅ ${result.message}. Processed: ${result.processed}, Failed: ${result.failed}`
            );
            loadFiles();
        } catch (error) {
            setProcessingStatus("❌ Failed to vectorize files");
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this file and its embedding?")) return;
        try {
            await deleteFile(id);
            loadFiles();
        } catch (error) {
            console.error("Failed to delete file:", error);
        }
    };

    const handleDeleteEmbedding = async (id: number) => {
        if (!confirm("Are you sure you want to delete only the embedding? The file will be kept.")) return;
        try {
            await deleteEmbedding(id);
            loadFiles();
        } catch (error) {
            console.error("Failed to delete embedding:", error);
        }
    };

    const handleRecalculate = async (id: number) => {
        const file = files.find(f => f.id === id);
        const fileName = file ? (file.video_title || file.actual_file_name) : `ID ${id}`;

        try {
            setProcessing(true);
            setRecalculatingFiles(prev => new Set(prev).add(id));
            setProcessingStatus(`🔄 Recalculating embedding for: ${fileName}...`);

            await recalculateEmbedding(id);

            setProcessingStatus(`✅ Successfully recalculated embedding for: ${fileName}`);
            await loadFiles();
        } catch (error) {
            console.error("Failed to recalculate embedding:", error);
            setProcessingStatus(`❌ Failed to recalculate embedding for: ${fileName}`);
        } finally {
            setProcessing(false);
            setRecalculatingFiles(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleDeleteAllEmbeddings = async () => {
        try {
            setProcessing(true);
            setProcessingStatus("🗑️ Deleting all embeddings...");
            const result = await deleteAllEmbeddings();
            setProcessingStatus(`✅ ${result.message}`);
            await loadFiles();
        } catch (error) {
            console.error("Failed to delete all embeddings:", error);
            setProcessingStatus("❌ Failed to delete all embeddings");
        } finally {
            setProcessing(false);
        }
    };

    const handleResetEmbeddings = async () => {
        try {
            setProcessing(true);
            setProcessingStatus("🔄 Resetting embeddings table...");
            const result = await resetEmbeddings();
            setProcessingStatus(`✅ ${result.message}`);
            await loadFiles();
        } catch (error) {
            console.error("Failed to reset embeddings:", error);
            setProcessingStatus("❌ Failed to reset embeddings table");
        } finally {
            setProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setProcessing(true);
            setProcessingStatus("Uploading file...");
            await uploadFile(file);
            setProcessingStatus(`✅ Uploaded ${file.name} successfully`);
            loadFiles();
        } catch (error) {
            setProcessingStatus("❌ Failed to upload file");
        } finally {
            setProcessing(false);
        }
    };

    const stats = {
        total: files.length,
        embedded: files.filter((f) => f.has_embedding).length,
        pending: files.filter((f) => !f.has_embedding).length,
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case "ERROR": return <AlertTriangle size={12} />;
            case "WARNING": return <AlertTriangle size={12} />;
            case "DEBUG": return <Bug size={12} />;
            default: return <Info size={12} />;
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.wrapper}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <Database style={{ color: "white" }} size={24} />
                    </div>
                    <div>
                        <h1 style={styles.headerTitle}>Admin Panel</h1>
                        <p style={styles.headerSubtitle}>
                            Manage your summary database and embeddings
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={styles.statsGrid}>
                    <div style={styles.statCard("linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)")}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={styles.statLabel}>Total Files</p>
                                <p style={styles.statValue}>{stats.total}</p>
                            </div>
                            <Database size={32} style={{ opacity: 0.6 }} />
                        </div>
                    </div>

                    <div style={styles.statCard("linear-gradient(135deg, #22c55e 0%, #16a34a 100%)")}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={styles.statLabel}>Embedded</p>
                                <p style={styles.statValue}>{stats.embedded}</p>
                            </div>
                            <CheckCircle size={32} style={{ opacity: 0.6 }} />
                        </div>
                    </div>

                    <div style={styles.statCard("linear-gradient(135deg, #f59e0b 0%, #f97316 100%)")}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={styles.statLabel}>Pending</p>
                                <p style={styles.statValue}>{stats.pending}</p>
                            </div>
                            <Clock size={32} style={{ opacity: 0.6 }} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <Tabs defaultValue="files">
                    <TabsList style={{ marginBottom: "20px" }}>
                        <TabsTrigger value="files">All Files</TabsTrigger>
                        <TabsTrigger value="upload">Upload & Process</TabsTrigger>
                        <TabsTrigger value="logs" onClick={loadLogs}>
                            Logs {debugEnabled && <Badge variant="success" style={{ marginLeft: "6px", fontSize: "10px" }}>DEBUG</Badge>}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="files">
                        <div style={styles.card}>
                            <div style={styles.cardHeader}>
                                <h3 style={styles.cardTitle}>
                                    <Database size={18} />
                                    File & Embedding Management
                                </h3>
                                <p style={styles.cardDescription}>Search, view, and manage all files and their embeddings</p>
                            </div>
                            <div style={styles.cardContent}>
                                {/* Search */}
                                <div style={styles.searchWrapper}>
                                    <div style={{ flex: 1, position: "relative" }}>
                                        <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                                        <Input
                                            placeholder="Search by title, filename, or source..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ paddingLeft: "36px" }}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                style={{
                                                    position: "absolute",
                                                    right: "12px",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    padding: 0,
                                                }}
                                            >
                                                <X size={16} style={{ color: "#94a3b8" }} />
                                            </button>
                                        )}
                                    </div>
                                    <span style={{ fontSize: "13px", color: "#64748b", whiteSpace: "nowrap" }}>
                                        {filteredFiles.length} of {files.length} files
                                    </span>
                                    <Button
                                        variant="destructive"
                                        onClick={handleResetEmbeddings}
                                        disabled={processing}
                                        style={{ display: "flex", gap: "6px", alignItems: "center" }}
                                    >
                                        <Trash2 size={14} />
                                        Reset All Embeddings
                                    </Button>
                                </div>

                                {loading ? (
                                    <div style={{ textAlign: "center", padding: "48px" }}>
                                        <div
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                                border: "4px solid #3b82f6",
                                                borderTopColor: "transparent",
                                                borderRadius: "50%",
                                                animation: "spin 1s linear infinite",
                                                margin: "0 auto",
                                            }}
                                        />
                                    </div>
                                ) : filteredFiles.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
                                        <Database size={40} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                                        <p>{searchQuery ? "No files match your search" : "No files in database"}</p>
                                    </div>
                                ) : (
                                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                                        <table style={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={styles.tableHeader}>Title</th>
                                                    <th style={styles.tableHeader}>Source</th>
                                                    <th style={styles.tableHeader}>Date</th>
                                                    <th style={styles.tableHeader}>Embedding Status</th>
                                                    <th style={{ ...styles.tableHeader, textAlign: "right" }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredFiles.map((file) => (
                                                    <tr key={file.id} style={{ transition: "background-color 0.2s" }}>
                                                        <td style={{ ...styles.tableCell, fontWeight: 500, color: "#1e293b", maxWidth: "250px" }}>
                                                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {file.video_title || file.actual_file_name}
                                                            </div>
                                                        </td>
                                                        <td style={styles.tableCell}>
                                                            <Badge variant={file.site_name === "youtube" ? "destructive" : "secondary"}>
                                                                {file.site_name}
                                                            </Badge>
                                                        </td>
                                                        <td style={{ ...styles.tableCell, color: "#64748b" }}>{formatDate(file.extract_date)}</td>
                                                        <td style={styles.tableCell}>
                                                            {file.has_embedding ? (
                                                                <div>
                                                                    <Badge variant="success" style={{ marginBottom: "4px" }}>
                                                                        <CheckCircle size={12} style={{ marginRight: "4px" }} />
                                                                        Embedded
                                                                    </Badge>
                                                                    {file.model_used && (
                                                                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                                                                            Model: {file.model_used}
                                                                        </div>
                                                                    )}
                                                                    {file.calc_date && (
                                                                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                                                                            <Clock size={10} />
                                                                            {formatDate(file.calc_date)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Badge variant="outline">
                                                                    <Clock size={12} style={{ marginRight: "4px" }} />
                                                                    Pending
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td style={{ ...styles.tableCell, textAlign: "right" }}>
                                                            <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleRecalculate(file.id)}
                                                                    disabled={recalculatingFiles.has(file.id)}
                                                                    title="Recalculate Embedding"
                                                                    style={{ height: "32px", width: "32px", padding: 0 }}
                                                                >
                                                                    <RefreshCw size={14} className={recalculatingFiles.has(file.id) ? "animate-spin text-blue-500" : ""} />
                                                                </Button>
                                                                {file.has_embedding && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteEmbedding(file.id)}
                                                                        title="Delete Embedding Only"
                                                                        style={{ height: "32px", width: "32px", padding: 0, color: "#f59e0b" }}
                                                                    >
                                                                        <X size={14} />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(file.id)}
                                                                    title="Delete File"
                                                                    style={{ height: "32px", width: "32px", padding: 0, color: "#ef4444" }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                            {/* Batch Process Card */}
                            <div style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>
                                        <FolderOpen size={18} />
                                        Batch Process Directory
                                    </h3>
                                    <p style={styles.cardDescription}>Process all .md files from a local directory</p>
                                </div>
                                <div style={styles.cardContent}>
                                    <Input
                                        placeholder="C:\path\to\summaries"
                                        value={directoryPath}
                                        onChange={(e) => setDirectoryPath(e.target.value)}
                                        style={{ marginBottom: "12px" }}
                                    />
                                    <Button
                                        onClick={handleBatchProcess}
                                        disabled={!directoryPath.trim() || processing}
                                        style={{ width: "100%" }}
                                    >
                                        <FolderOpen size={16} style={{ marginRight: "8px" }} />
                                        Process Directory
                                    </Button>
                                </div>
                            </div>

                            {/* Upload Card */}
                            <div style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>
                                        <Upload size={18} />
                                        Upload Single File
                                    </h3>
                                    <p style={styles.cardDescription}>Upload a single .md summary file</p>
                                </div>
                                <div style={styles.cardContent}>
                                    <label style={styles.uploadZone}>
                                        <Upload size={28} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                                        <span style={{ fontSize: "14px", color: "#64748b" }}>Click to upload .md file</span>
                                        <input type="file" accept=".md" onChange={handleFileUpload} style={{ display: "none" }} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Vectorize Card */}
                        <div style={styles.card}>
                            <div style={styles.cardHeader}>
                                <h3 style={styles.cardTitle}>
                                    <Zap size={18} style={{ color: "#a855f7" }} />
                                    Generate Embeddings
                                </h3>
                                <p style={styles.cardDescription}>Generate vector embeddings for all files without embeddings</p>
                            </div>
                            <div style={styles.cardContent}>
                                <Button
                                    onClick={handleVectorizeAll}
                                    disabled={processing || stats.pending === 0}
                                    style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                                >
                                    <Zap size={16} style={{ marginRight: "8px" }} />
                                    Vectorize All ({stats.pending} pending)
                                </Button>
                            </div>
                        </div>

                        {processingStatus && (
                            <div style={{ backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "16px" }}>
                                <p style={{ margin: 0, fontSize: "14px" }}>{processingStatus}</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="logs">
                        <div style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <h3 style={styles.cardTitle}>
                                            <Terminal size={18} />
                                            Application Logs
                                        </h3>
                                        <p style={styles.cardDescription}>
                                            {debugEnabled
                                                ? "Debug mode is enabled - showing verbose logs"
                                                : "Debug mode is disabled - run with HOLLER_DEBUG=true to enable"}
                                        </p>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <Button variant="outline" size="sm" onClick={loadLogs} disabled={logsLoading}>
                                            <RefreshCw size={14} style={{ marginRight: "6px" }} />
                                            Refresh
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleClearLogs}>
                                            <Trash2 size={14} style={{ marginRight: "6px" }} />
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div style={styles.cardContent}>
                                {!debugEnabled && (
                                    <div style={{ backgroundColor: "#fef9c3", borderRadius: "8px", padding: "16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                                        <AlertTriangle size={18} style={{ color: "#ca8a04", flexShrink: 0 }} />
                                        <div>
                                            <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: "#854d0e" }}>Debug Mode Disabled</p>
                                            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#a16207" }}>
                                                To enable verbose logging, restart the backend with: <code style={{ backgroundColor: "#fef3c7", padding: "2px 6px", borderRadius: "4px" }}>HOLLER_DEBUG=true uvicorn app.main:app --reload --port 8000</code>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {logsLoading ? (
                                    <div style={{ textAlign: "center", padding: "32px" }}>
                                        <div
                                            style={{
                                                width: "24px",
                                                height: "24px",
                                                border: "3px solid #64748b",
                                                borderTopColor: "transparent",
                                                borderRadius: "50%",
                                                animation: "spin 1s linear infinite",
                                                margin: "0 auto",
                                            }}
                                        />
                                    </div>
                                ) : logs.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
                                        <Terminal size={40} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                                        <p>No logs available</p>
                                    </div>
                                ) : (
                                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", maxHeight: "400px", overflowY: "auto", backgroundColor: "#fafafa" }}>
                                        {logs.map((log, index) => {
                                            const levelStyle = styles.logLevel(log.level);
                                            return (
                                                <div key={index} style={styles.logEntry}>
                                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                                        <span style={{ color: "#94a3b8", fontSize: "11px", whiteSpace: "nowrap" }}>
                                                            {new Date(log.timestamp).toLocaleTimeString()}
                                                        </span>
                                                        <span style={{
                                                            backgroundColor: levelStyle.bg,
                                                            color: levelStyle.text,
                                                            padding: "1px 6px",
                                                            borderRadius: "4px",
                                                            fontSize: "10px",
                                                            fontWeight: 600,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                        }}>
                                                            {getLevelIcon(log.level)}
                                                            {log.level}
                                                        </span>
                                                        <span style={{ color: "#64748b", fontSize: "11px" }}>[{log.source}]</span>
                                                        <span style={{ color: "#1e293b", flex: 1 }}>{log.message}</span>
                                                    </div>
                                                    {log.details && (
                                                        <div style={{ marginLeft: "80px", marginTop: "4px", color: "#64748b", fontSize: "11px" }}>
                                                            {log.details}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
