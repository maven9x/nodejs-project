// ---- Error payload do server trả về
export interface IApiErrorPayload {
    message?: string;
    error?: string;
    // mở rộng nếu backend có field khác, ví dụ:
    // code?: string | number;
    // details?: unknown;
}

export interface IApiBaseServiceOptions {
    baseURL: string;
    timeout?: number;
    enableLogging?: boolean;
    retryAttempts?: number;
    retryDelay?: number; // ms
    onUnauthorized?: () => void;
    onTokenRefresh?: () => Promise<string>; // trả về access token mới
}


