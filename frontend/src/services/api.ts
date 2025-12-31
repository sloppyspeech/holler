const API_BASE_URL = "http://localhost:8000/api";

export interface FileMetadata {
    id: number;
    actual_file_name: string;
    site_name: string;
    video_title: string | null;
    extract_date: string | null;
    created_at: string | null;
    model_used: string | null;
    calc_date: string | null;
    has_embedding: boolean;
}

export interface FileDetail extends FileMetadata {
    transcript: string | null;
    summary: string | null;
    mind_map: string | null;
    key_takeaway: string | null;
    raw_content: string | null;
}

export interface SearchResult {
    id: number;
    actual_file_name: string;
    site_name: string;
    video_title: string | null;
    extract_date: string | null;
    summary: string | null;
    has_embedding: boolean;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    model_used?: string;
    response_time_ms?: number;
    context_sources?: Array<{
        file_id: number;
        title: string;
        distance: number;
    }>;
}

export interface ChatResponse {
    message: string;
    context_sources: Array<{
        file_id: number;
        title: string;
        distance: number;
    }>;
    session_id: string;
    model_used?: string;
    response_time_ms?: number;
}

export interface ChatSession {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface ModelInfo {
    name: string;
    is_current: boolean;
    is_app_current: boolean;
}

export interface ProcessingResult {
    success: boolean;
    message: string;
    processed_count: number;
    failed_count: number;
    errors: string[];
}

// Files API
export async function fetchFiles(): Promise<FileMetadata[]> {
    const response = await fetch(`${API_BASE_URL}/files`);
    if (!response.ok) throw new Error("Failed to fetch files");
    return response.json();
}

export async function fetchFile(id: number): Promise<FileDetail> {
    const response = await fetch(`${API_BASE_URL}/files/${id}`);
    if (!response.ok) throw new Error("Failed to fetch file");
    return response.json();
}

export async function searchFiles(query: string): Promise<SearchResult[]> {
    const response = await fetch(
        `${API_BASE_URL}/files/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) throw new Error("Failed to search files");
    return response.json();
}

export async function deleteFile(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/files/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete file");
}

export async function recalculateEmbedding(
    id: number
): Promise<{ message: string; model: string }> {
    const response = await fetch(`${API_BASE_URL}/files/${id}/recalculate`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to recalculate embedding");
    return response.json();
}

export async function deleteEmbedding(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/files/${id}/embedding`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete embedding");
}

export async function uploadFile(file: File): Promise<{ file_id: number }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: "POST",
        body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload file");
    return response.json();
}

export async function batchProcess(
    directoryPath: string
): Promise<ProcessingResult> {
    const response = await fetch(`${API_BASE_URL}/files/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory_path: directoryPath }),
    });
    if (!response.ok) throw new Error("Failed to batch process");
    return response.json();
}

export async function vectorizeAll(): Promise<{
    message: string;
    processed: number;
    failed: number;
}> {
    const response = await fetch(`${API_BASE_URL}/files/vectorize-all`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to vectorize");
    return response.json();
}

export async function deleteAllEmbeddings(): Promise<{
    message: string;
    deleted_count: number;
}> {
    const response = await fetch(`${API_BASE_URL}/files/embeddings/all`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete embeddings");
    return response.json();
}

export async function resetEmbeddings(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/files/reset-embeddings`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to reset embeddings");
    return response.json();
}

// Chat API
export async function sendChatMessage(
    message: string,
    sessionId?: string,
    model?: string
): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId, model }),
    });
    if (!response.ok) throw new Error("Failed to send message");
    return response.json();
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);
    if (!response.ok) throw new Error("Failed to get chat history");
    return response.json();
}

export const fetchHistory = getChatHistory;

export async function clearSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to clear session");
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
    const response = await fetch(`${API_BASE_URL}/chat/sessions`);
    if (!response.ok) throw new Error("Failed to fetch chat sessions");
    return response.json();
}

// Models API
export async function fetchModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) throw new Error("Failed to fetch models");
    return response.json();
}

export async function fetchModelStatus(): Promise<{
    connected: boolean;
    current_model: string;
    default_app_model: string;
}> {
    const response = await fetch(`${API_BASE_URL}/models/status`);
    if (!response.ok) throw new Error("Failed to fetch model status");
    return response.json();
}

export async function setCurrentModel(
    modelName: string
): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/models/current`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: modelName }),
    });
    if (!response.ok) throw new Error("Failed to set model");
    return response.json();
}

export async function setAppModel(
    modelName: string
): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/models/app`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: modelName }),
    });
    if (!response.ok) throw new Error("Failed to set app model");
    return response.json();
}

export async function fetchAppModel(): Promise<{ model: string }> {
    const response = await fetch(`${API_BASE_URL}/models/app`);
    if (!response.ok) throw new Error("Failed to fetch app model");
    return response.json();
}

// Logs API
export interface LogEntry {
    timestamp: string;
    level: string;
    source: string;
    message: string;
    details: string | null;
}

export interface LogsResponse {
    debug_enabled: boolean;
    count: number;
    logs: LogEntry[];
}

export async function fetchLogs(count: number = 100): Promise<LogsResponse> {
    const response = await fetch(`${API_BASE_URL}/logs?count=${count}`);
    if (!response.ok) throw new Error("Failed to fetch logs");
    return response.json();
}

export async function fetchDebugStatus(): Promise<{ debug_enabled: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/logs/status`);
    if (!response.ok) throw new Error("Failed to fetch debug status");
    return response.json();
}

export async function clearLogs(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/logs`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to clear logs");
}
