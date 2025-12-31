import { useState, useEffect } from "react";
import { Cpu, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    fetchModels,
    fetchModelStatus,
    setCurrentModel,
    setAppModel,
    type ModelInfo,
} from "@/services/api";

const styles = {
    container: {
        height: "100%",
        overflow: "auto",
        backgroundColor: "hsl(var(--background))",
        padding: "32px",
    } as React.CSSProperties,
    wrapper: {
        maxWidth: "700px",
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
        background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
        flexShrink: 0,
    } as React.CSSProperties,
    headerTitle: {
        fontSize: "24px",
        fontWeight: 700,
        color: "hsl(var(--foreground))",
        margin: 0,
    } as React.CSSProperties,
    headerSubtitle: {
        fontSize: "14px",
        color: "hsl(var(--muted-foreground))",
        margin: 0,
    } as React.CSSProperties,
    card: {
        backgroundColor: "hsl(var(--card))",
        borderRadius: "12px",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        marginBottom: "16px",
        padding: "24px",
    } as React.CSSProperties,
    cardHeader: {
        padding: "20px 24px 16px 24px",
    } as React.CSSProperties,
    cardTitle: {
        fontSize: "16px",
        fontWeight: 600,
        color: "hsl(var(--foreground))",
        margin: "0 0 6px 0",
    } as React.CSSProperties,
    cardDescription: {
        fontSize: "14px",
        color: "hsl(var(--muted-foreground))",
        margin: 0,
    } as React.CSSProperties,
    cardContent: {
        padding: "0 24px 24px 24px",
    } as React.CSSProperties,
    connectionCard: (connected: boolean) => ({
        backgroundColor: connected ? "hsl(var(--success-bg) / 0.15)" : "hsl(var(--destructive) / 0.15)",
        border: `2px solid ${connected ? "hsl(var(--success-bg) / 0.3)" : "hsl(var(--destructive) / 0.3)"}`,
        borderRadius: "12px",
        padding: "20px 24px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    }) as React.CSSProperties,
    currentModelCard: (gradient: string) => ({
        background: gradient,
        borderRadius: "12px",
        padding: "24px",
        color: "white",
        marginBottom: "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    }) as React.CSSProperties,
    modelItem: (isActive: boolean, activeColor: string) => ({
        padding: "16px",
        borderRadius: "8px",
        border: isActive ? `2px solid ${activeColor}` : "1px solid hsl(var(--border))",
        backgroundColor: isActive ? "hsl(var(--accent))" : "hsl(var(--card))",
        transition: "all 0.2s",
    }) as React.CSSProperties,
    infoCard: {
        backgroundColor: "hsl(var(--muted))",
        borderRadius: "12px",
        padding: "24px",
    } as React.CSSProperties,
};

export function ManageModelsPage() {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [status, setStatus] = useState<{
        connected: boolean;
        current_model: string;
        default_app_model: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [modelsData, statusData] = await Promise.all([
                fetchModels(),
                fetchModelStatus(),
            ]);
            setModels(modelsData);
            setStatus(statusData);
        } catch (error) {
            console.error("Failed to load models:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetEmbeddingModel = async (modelName: string) => {
        try {
            await setCurrentModel(modelName);
            await loadData();
        } catch (error) {
            console.error("Failed to set embedding model:", error);
        }
    };

    const handleSetAppModel = async (modelName: string) => {
        try {
            await setAppModel(modelName);
            await loadData();
        } catch (error) {
            console.error("Failed to set app model:", error);
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
                    <p style={{ fontSize: "14px", color: "#64748b" }}>Loading models...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.wrapper}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <Cpu style={{ color: "white" }} size={24} />
                    </div>
                    <div>
                        <h1 style={styles.headerTitle}>Manage Models</h1>
                        <p style={styles.headerSubtitle}>Configure AI models for embedding and interaction</p>
                    </div>
                </div>

                {/* Connection Status */}
                <div style={styles.connectionCard(status?.connected ?? false)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: status?.connected ? "#dcfce7" : "#fee2e2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            {status?.connected ? (
                                <Wifi size={20} style={{ color: "#16a34a" }} />
                            ) : (
                                <WifiOff size={20} style={{ color: "#dc2626" }} />
                            )}
                        </div>
                        <div>
                            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", color: "hsl(var(--foreground))" }}>Ollama Connection Status</h3>
                            <p style={{ fontSize: "14px", color: status?.connected ? "#22c55e" : "hsl(var(--destructive))", margin: 0 }}>
                                {status?.connected ? "Connected and ready" : "Not connected - Please start Ollama"}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData}>
                        <RefreshCw size={14} style={{ marginRight: "8px" }} />
                        Refresh
                    </Button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    {/* Current Embedding Model */}
                    <div style={styles.currentModelCard("linear-gradient(135deg, #a855f7 0%, #ec4899 100%)")}>
                        <p style={{ fontSize: "11px", opacity: 0.85, margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Embedding Model
                        </p>
                        <p style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{status?.current_model || "Not set"}</p>
                    </div>

                    {/* Default App Model */}
                    <div style={styles.currentModelCard("linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)")}>
                        <p style={{ fontSize: "11px", opacity: 0.85, margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Default Chat Model
                        </p>
                        <p style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{status?.default_app_model || "Not set"}</p>
                    </div>
                </div>

                {/* Available Models */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Available Models</h3>
                    <p style={{ ...styles.cardDescription, marginBottom: "20px" }}>
                        Configure which models to use for different functions of the app
                    </p>

                    {models.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                            <Cpu size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                            <p style={{ fontSize: "14px", margin: "0 0 4px 0" }}>No models found</p>
                            <p style={{ fontSize: "12px", margin: 0 }}>Make sure Ollama is running with models installed</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                            {models.map((model) => (
                                <div
                                    key={model.name}
                                    style={styles.modelItem(model.is_current || model.is_app_current, model.is_current ? "#a855f7" : "#3b82f6")}
                                >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                            <div style={{
                                                width: "44px",
                                                height: "44px",
                                                borderRadius: "10px",
                                                backgroundColor: "hsl(var(--muted))",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0
                                            }}>
                                                <Cpu size={22} style={{ color: "hsl(var(--muted-foreground))" }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 2px 0", color: "hsl(var(--foreground))" }}>{model.name}</p>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    {model.is_current && <Badge variant="default" style={{ backgroundColor: "#a855f7", fontSize: "10px" }}>Active Embedding</Badge>}
                                                    {model.is_app_current && <Badge variant="default" style={{ backgroundColor: "#3b82f6", fontSize: "10px" }}>Active Chat</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            {!model.is_current && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSetEmbeddingModel(model.name)}
                                                    style={{ fontSize: "12px", height: "32px" }}
                                                >
                                                    Use as Embedding
                                                </Button>
                                            )}
                                            {!model.is_app_current && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSetAppModel(model.name)}
                                                    style={{ fontSize: "12px", height: "32px" }}
                                                >
                                                    Use as Chat
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div style={styles.infoCard}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px 0" }}>💡 Model Types</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px 0", color: "#a855f7" }}>Embedding Models</p>
                            <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>Used to convert text into numbers for vector search. Recommended: <strong>nomic-embed-text</strong>.</p>
                        </div>
                        <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px 0", color: "#3b82f6" }}>Application/Chat Models</p>
                            <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>Used for the RAG chat and summarizing. Recommended: <strong>llama3</strong>, <strong>mistral</strong>, or <strong>phi3</strong>.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
