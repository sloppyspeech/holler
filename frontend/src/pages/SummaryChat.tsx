import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, Cpu, Clock, MessageSquare, Trash2, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    sendChatMessage,
    fetchModels,
    fetchModelStatus,
    fetchHistory,
    clearSession,
    fetchChatSessions,
    type ChatMessage,
    type ChatResponse,
    type ModelInfo,
    type ChatSession
} from "@/services/api";

interface Message extends ChatMessage { }

const styles = {
    container: {
        display: "flex",
        flexDirection: "row" as const,
        height: "100%",
        backgroundColor: "#f8fafc",
        overflow: "hidden",
    } as React.CSSProperties,
    sidebar: {
        width: "280px",
        backgroundColor: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column" as const,
        height: "100%",
    } as React.CSSProperties,
    sidebarHeader: {
        padding: "20px",
        borderBottom: "1px solid #f1f5f9",
    } as React.CSSProperties,
    sidebarContent: {
        flex: 1,
        overflow: "auto",
        padding: "12px",
    } as React.CSSProperties,
    sessionItem: (active: boolean) => ({
        padding: "12px",
        borderRadius: "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        marginBottom: "4px",
        backgroundColor: active ? "#f1f5f9" : "transparent",
        transition: "background-color 0.2s",
        border: active ? "1px solid #e2e8f0" : "1px solid transparent",
    }) as React.CSSProperties,
    mainChat: {
        flex: 1,
        display: "flex",
        flexDirection: "column" as const,
        height: "100%",
        position: "relative" as const,
    } as React.CSSProperties,
    header: {
        padding: "16px 32px",
        backgroundColor: "white",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    } as React.CSSProperties,
    headerContent: {
        maxWidth: "800px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    } as React.CSSProperties,
    headerIcon: {
        width: "40px",
        height: "40px",
        borderRadius: "10px",
        background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)",
    } as React.CSSProperties,
    headerTitle: {
        fontSize: "18px",
        fontWeight: 700,
        color: "#1e293b",
        margin: 0,
    } as React.CSSProperties,
    headerSubtitle: {
        fontSize: "12px",
        color: "#64748b",
        margin: 0,
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
    messagesArea: {
        flex: 1,
        overflow: "auto",
        padding: "32px",
    } as React.CSSProperties,
    welcomeContainer: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        textAlign: "center" as const,
        padding: "48px",
    } as React.CSSProperties,
    welcomeIcon: {
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px",
    } as React.CSSProperties,
    welcomeTitle: {
        fontSize: "20px",
        fontWeight: 600,
        color: "#374151",
        margin: "0 0 8px 0",
    } as React.CSSProperties,
    welcomeText: {
        fontSize: "14px",
        color: "#64748b",
        maxWidth: "420px",
        margin: "0 0 28px 0",
        lineHeight: 1.6,
    } as React.CSSProperties,
    suggestionsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "12px",
        maxWidth: "560px",
    } as React.CSSProperties,
    suggestionCard: {
        backgroundColor: "white",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
        padding: "16px",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "left" as const,
    } as React.CSSProperties,
    messagesContainer: {
        maxWidth: "800px",
        margin: "0 auto",
    } as React.CSSProperties,
    messageRow: (isUser: boolean) => ({
        display: "flex",
        gap: "14px",
        marginBottom: "24px",
        flexDirection: isUser ? "row-reverse" as const : "row" as const,
    }) as React.CSSProperties,
    avatar: (isUser: boolean) => ({
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: isUser
            ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            : "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    }) as React.CSSProperties,
    messageContent: (isUser: boolean) => ({
        flex: 1,
        maxWidth: "640px",
        textAlign: isUser ? "right" as const : "left" as const,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: isUser ? "flex-end" as const : "flex-start" as const,
    }) as React.CSSProperties,
    messageBubble: (isUser: boolean) => ({
        display: "inline-block",
        textAlign: "left" as const,
        backgroundColor: isUser ? "#3b82f6" : "white",
        color: isUser ? "white" : "#1e293b",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "16px",
        boxShadow: isUser
            ? "0 4px 12px rgba(59, 130, 246, 0.15)"
            : "0 2px 8px rgba(0, 0, 0, 0.05)",
        border: isUser ? "none" : "1px solid #e2e8f0",
        position: "relative" as const,
    }) as React.CSSProperties,
    messageFooter: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginTop: "6px",
        padding: "0 4px",
    } as React.CSSProperties,
    footerItem: {
        fontSize: "11px",
        color: "#94a3b8",
        display: "flex",
        alignItems: "center",
        gap: "4px",
    } as React.CSSProperties,
    sourcesRow: {
        marginTop: "12px",
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "6px",
        alignItems: "center",
    } as React.CSSProperties,
    inputArea: {
        padding: "20px 32px",
        backgroundColor: "white",
        borderTop: "1px solid #e2e8f0",
    } as React.CSSProperties,
    inputContainer: {
        maxWidth: "800px",
        margin: "0 auto",
        display: "flex",
        gap: "12px",
    } as React.CSSProperties,
    inputFooter: {
        fontSize: "12px",
        color: "#94a3b8",
        textAlign: "center" as const,
        marginTop: "10px",
    } as React.CSSProperties,
};

/**
 * Format milliseconds into a human-readable string
 */
const formatDuration = (ms: number | undefined): string => {
    if (ms === undefined || ms === 0) return "";
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)} mins`;
};

export function SummaryChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | undefined>(() => {
        return localStorage.getItem("holler_chat_session") || undefined;
    });
    const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial load: models, status, and sessions
    useEffect(() => {
        loadInitialData();
        loadSessions();
    }, []);

    // Load history when sessionId changes (or is first loaded)
    useEffect(() => {
        if (sessionId) {
            loadHistory(sessionId);
        }
    }, [sessionId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadInitialData = async () => {
        try {
            const [models, status] = await Promise.all([
                fetchModels(),
                fetchModelStatus()
            ]);
            setAvailableModels(models);

            // Override with stored model if available, else default
            const storedModel = localStorage.getItem("holler_selected_model");
            setSelectedModel(storedModel || status.default_app_model);
        } catch (error) {
            console.error("Failed to load initial data:", error);
        }
    };

    const loadSessions = async () => {
        try {
            const historySessions = await fetchChatSessions();
            setSessions(historySessions);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    const loadHistory = async (sid: string) => {
        try {
            const history = await fetchHistory(sid);
            if (history && history.length > 0) {
                setMessages(history);
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    };

    const handleModelChange = (model: string) => {
        setSelectedModel(model);
        localStorage.setItem("holler_selected_model", model);
    };

    const handleNewChat = () => {
        setSessionId(undefined);
        setMessages([]);
        localStorage.removeItem("holler_chat_session");
    };

    const handleSelectSession = async (id: string) => {
        setSessionId(id);
        localStorage.setItem("holler_chat_session", id);
    };

    const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();

        // Delete directly (browser is blocking confirm dialogs)
        try {
            console.log("Deleting session:", id);
            await clearSession(id);
            console.log("Session deleted successfully");
            if (sessionId === id) {
                handleNewChat();
            }
            await loadSessions();
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            role: "user",
            content: input,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const response: ChatResponse = await sendChatMessage(input, sessionId, selectedModel);

            if (response.session_id !== sessionId) {
                setSessionId(response.session_id);
                localStorage.setItem("holler_chat_session", response.session_id);
                loadSessions(); // Reload sessions to show the new one
            }

            const assistantMessage: Message = {
                role: "assistant",
                content: response.message,
                timestamp: new Date().toISOString(),
                context_sources: response.context_sources,
                model_used: response.model_used,
                response_time_ms: response.response_time_ms,
            };

            setMessages((prev: Message[]) => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please make sure the backend server is running and Ollama is accessible.",
                timestamp: new Date().toISOString(),
            };
            setMessages((prev: Message[]) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestions = [
        "What videos discuss Python programming?",
        "Summarize the key points about machine learning",
        "What are the main takeaways from recent videos?",
        "Find videos related to web development",
    ];

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <Button
                        variant="outline"
                        style={{ width: "100%", justifyContent: "flex-start", gap: "10px", borderRadius: "10px" }}
                        onClick={handleNewChat}
                    >
                        <Plus size={16} />
                        New Chat
                    </Button>
                </div>

                <div style={styles.sidebarContent}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 10px 8px 10px" }}>
                        History
                    </p>
                    {sessions.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                            No conversations yet
                        </div>
                    ) : (
                        sessions.map((s: ChatSession) => (
                            <div
                                key={s.id}
                                style={styles.sessionItem(sessionId === s.id)}
                                onClick={() => handleSelectSession(s.id)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                    <MessageSquare size={14} style={{ color: sessionId === s.id ? "#3b82f6" : "#94a3b8", flexShrink: 0 }} />
                                    <span style={{
                                        fontSize: "13px",
                                        color: sessionId === s.id ? "#1e293b" : "#64748b",
                                        fontWeight: sessionId === s.id ? 600 : 400,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>
                                        {s.title}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    style={{
                                        padding: "6px",
                                        height: "28px",
                                        width: "28px",
                                        minWidth: "28px",
                                        opacity: sessionId === s.id ? 1 : 0,
                                        pointerEvents: sessionId === s.id ? "auto" : "none",
                                        zIndex: 10,
                                        cursor: "pointer"
                                    }}
                                    onClick={(e) => handleDeleteSession(e, s.id)}
                                >
                                    <Trash2 size={14} style={{ color: "#ef4444" }} />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={styles.mainChat}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerContent}>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <div style={styles.headerIcon}>
                                <MessageSquare style={{ color: "white" }} size={20} />
                            </div>
                            <div>
                                <h1 style={styles.headerTitle}>Summary Chat</h1>
                                <p style={styles.headerSubtitle}>Intelligent dialogue with your library</p>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={styles.modelSelector}>
                                <Cpu size={14} style={{ color: "#64748b" }} />
                                <select
                                    style={styles.select}
                                    value={selectedModel}
                                    onChange={(e) => handleModelChange(e.target.value)}
                                >
                                    {availableModels.map((m: ModelInfo) => (
                                        <option key={m.name} value={m.name}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat Messages */}
                <div ref={scrollRef} style={styles.messagesArea}>
                    {messages.length === 0 ? (
                        <div style={styles.welcomeContainer}>
                            <div style={styles.welcomeIcon}>
                                <Bot size={32} style={{ color: "#a855f7" }} />
                            </div>
                            <h2 style={styles.welcomeTitle}>Welcome to Summary Chat</h2>
                            <p style={styles.welcomeText}>
                                Ask me anything about your YouTube video summaries. I'll search through your database and provide relevant answers.
                            </p>
                            <div style={styles.suggestionsGrid}>
                                {suggestions.map((suggestion) => (
                                    <div
                                        key={suggestion}
                                        style={styles.suggestionCard}
                                        onClick={() => setInput(suggestion)}
                                    >
                                        <p style={{ fontSize: "14px", color: "#475569", margin: 0 }}>{suggestion}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={styles.messagesContainer}>
                            {messages.map((message: Message, index: number) => (
                                <div key={index} style={styles.messageRow(message.role === "user")}>
                                    <div style={styles.avatar(message.role === "user")}>
                                        {message.role === "user" ? (
                                            <User size={16} style={{ color: "white" }} />
                                        ) : (
                                            <Bot size={16} style={{ color: "white" }} />
                                        )}
                                    </div>

                                    <div style={styles.messageContent(message.role === "user")}>
                                        <div style={styles.messageBubble(message.role === "user")}>
                                            <div style={{ fontSize: "14px", lineHeight: 1.7 }}>
                                                <ReactMarkdown>{message.content}</ReactMarkdown>
                                            </div>
                                        </div>

                                        {/* Footer with Metadata */}
                                        <div style={styles.messageFooter}>
                                            {message.role === "assistant" && message.model_used && (
                                                <div style={styles.footerItem}>
                                                    <Cpu size={10} />
                                                    {message.model_used}
                                                </div>
                                            )}
                                            {message.role === "assistant" && message.response_time_ms !== undefined && (
                                                <div style={styles.footerItem}>
                                                    <Clock size={10} />
                                                    {formatDuration(message.response_time_ms)}
                                                </div>
                                            )}
                                            {message.timestamp && (
                                                <div style={styles.footerItem}>
                                                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>

                                        {message.context_sources && message.context_sources.length > 0 && (
                                            <div style={styles.sourcesRow}>
                                                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Sources:</span>
                                                {message.context_sources.map((source: any, i: number) => (
                                                    <Badge key={i} variant="secondary" style={{ fontSize: "11px", fontWeight: "normal" }}>
                                                        <FileText size={10} style={{ marginRight: "4px" }} />
                                                        {source.title || `File ${source.file_id}`}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div style={styles.messageRow(false)}>
                                    <div style={styles.avatar(false)}>
                                        <Bot size={16} style={{ color: "white" }} />
                                    </div>
                                    <div style={styles.messageContent(false)}>
                                        <div style={styles.messageBubble(false)}>
                                            <div style={{ display: "flex", gap: "6px", padding: "4px 0" }}>
                                                <div style={{ width: "8px", height: "8px", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.6, animation: "bounce 1s infinite" }} />
                                                <div style={{ width: "8px", height: "8px", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.6, animation: "bounce 1s infinite 0.2s" }} />
                                                <div style={{ width: "8px", height: "8px", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.6, animation: "bounce 1s infinite 0.4s" }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div style={styles.inputArea}>
                    <div style={styles.inputContainer}>
                        <Input
                            placeholder="Ask a question about your summaries..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            style={{ flex: 1, height: "45px", borderRadius: "10px" }}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            style={{
                                background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                                height: "45px",
                                width: "45px",
                                borderRadius: "10px"
                            }}
                        >
                            <Send size={18} />
                        </Button>
                    </div>
                    <p style={styles.inputFooter}>Powered by RAG • Conversations are saved to your local database</p>
                </div>
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
            `}</style>
        </div>
    );
}
