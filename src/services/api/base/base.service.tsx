// apiClient.ts
import axios, { AxiosError, AxiosHeaders } from 'axios';
import type {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    AxiosProgressEvent,
} from 'axios';
import { storage } from '@app/utils/storage';
import { STORAGE_KEYS } from '@app/utils/constants';
import { type IApiBaseServiceOptions, type IApiErrorPayload } from '@app/types/api/base.types';
import { ApiClientError } from '@app/services/api/base';



class ApiBaseService {
    private instance: AxiosInstance;
    private options: Required<Omit<IApiBaseServiceOptions, 'onUnauthorized' | 'onTokenRefresh'>> &
        Pick<IApiBaseServiceOptions, 'onUnauthorized' | 'onTokenRefresh'>;
    private refreshPromise: Promise<string> | null = null;

    // lưu id interceptors để eject đúng cách
    private reqInterceptorId?: number;
    private resInterceptorId?: number;

    constructor(options: IApiBaseServiceOptions | string) {
        const normalized: IApiBaseServiceOptions =
            typeof options === 'string' ? { baseURL: options } : options;

        this.options = {
            timeout: 30_000,
            enableLogging: false,
            retryAttempts: 3,
            retryDelay: 1_000,
            ...normalized,
        };

        this.instance = axios.create({
            baseURL: this.options.baseURL,
            timeout: this.options.timeout,
            withCredentials: true,
            headers: new AxiosHeaders({ 'Content-Type': 'application/json' }),
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        this.reqInterceptorId = this.instance.interceptors.request.use(
            (config) => {
                const token = storage.getItem(STORAGE_KEYS.AUTH_TOKEN, '');
                if (token) {
                    this.setAuthHeader(config, token);
                }
                if (this.options.enableLogging) {
                    console.log(`🚀 API ${config.method?.toUpperCase()} ${config.url}`);
                }
                return config;
            },
            (err: unknown) => {
                if (this.options.enableLogging) console.error('❌ Request Error:', err);
                return Promise.reject(err);
            }
        );

        this.resInterceptorId = this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                if (this.options.enableLogging) {
                    console.log(`✅ ${response.status} ${response.config.url}`);
                }
                return response;
            },
            async (error: AxiosError<IApiErrorPayload>) => {
                if (this.options.enableLogging) {
                    console.error('❌ Response Error:', error);
                }

                const status = error.response?.status;
                const apiMessage = error.response?.data?.message ?? error.response?.data?.error;

                // 401 -> xử lý refresh token (nếu có)
                if (status === 401) {
                    return this.handle401Error(error);
                }

                const statusText = error.response?.statusText ?? 'Unknown';
                const message = status
                    ? `API Error: ${status} ${statusText}${apiMessage ? ` - ${apiMessage}` : ''}`
                    : apiMessage || 'Đã xảy ra lỗi không xác định';

                throw new ApiClientError<IApiErrorPayload>(
                    message,
                    status,
                    statusText,
                    error.response?.data
                );
            }
        );
    }

    private setAuthHeader(config: AxiosRequestConfig, token: string): void {
        if (config.headers && typeof (config.headers as AxiosHeaders).set === 'function') {
            (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
        } else {
            config.headers = {
                ...(config.headers ?? {}),
                Authorization: `Bearer ${token}`,
            };
        }
    }

    private async handle401Error(error: AxiosError<IApiErrorPayload>): Promise<AxiosResponse> {
        // Có onTokenRefresh => thử refresh (đảm bảo 1 lần đồng thời)
        if (this.options.onTokenRefresh) {
            if (!this.refreshPromise) {
                this.refreshPromise = this.options.onTokenRefresh();
            }
            try {
                const newToken = await this.refreshPromise;
                storage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
                const originalConfig = error.config;
                if (originalConfig) {
                    this.setAuthHeader(originalConfig, newToken);
                    return this.instance.request(originalConfig);
                }
            } catch (refreshErr) {
                if (this.options.enableLogging) {
                    console.error('Token refresh failed:', refreshErr);
                }
                this.handleLogout();
            } finally {
                this.refreshPromise = null;
            }
        } else {
            this.handleLogout();
        }

        throw new ApiClientError<IApiErrorPayload>('Phiên đăng nhập đã hết hạn', 401);
    }

    private handleLogout(): void {
        storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        if (this.options.onUnauthorized) {
            this.options.onUnauthorized();
        }
    }

    private async delay(ms: number): Promise<void> {
        await new Promise((r) => setTimeout(r, ms));
    }

    private isRetryableAxiosError(err: AxiosError): boolean {
        // Retry nếu lỗi mạng (không có response) hoặc 5xx
        const status = err.response?.status;
        return status == null || (status >= 500 && status < 600);
    }

    // ---- Request core với retry/backoff và AbortSignal
    private async request<T>(config: AxiosRequestConfig, retryCount = 0): Promise<T> {
        try {
            const res = await this.instance.request<T>(config);
            return res.data;
        } catch (err: unknown) {
            const isAxios = axios.isAxiosError(err);
            const status = isAxios ? err.response?.status : undefined;

            // Không retry 401 (đã xử lý ở interceptor), cũng không retry lỗi 4xx nói chung
            const canRetry =
                retryCount < this.options.retryAttempts &&
                (
                    (!isAxios) || // lỗi không phải Axios (ví dụ throw runtime) -> cho phép thử lại 1–2 lần
                    (isAxios && this.isRetryableAxiosError(err as AxiosError))
                ) &&
                status !== 401;

            if (canRetry) {
                const delayMs = this.options.retryDelay * Math.pow(2, retryCount); // exponential backoff
                if (this.options.enableLogging) {
                    console.warn(`⏳ Retry ${retryCount + 1}/${this.options.retryAttempts} in ${delayMs}ms`);
                }
                await this.delay(delayMs);
                return this.request<T>(config, retryCount + 1);
            }

            // Ném lại lỗi đã chuẩn hoá (nếu là AxiosError)
            if (isAxios) {
                const ax = err as AxiosError<IApiErrorPayload>;
                const apiMessage = ax.response?.data?.message ?? ax.response?.data?.error;
                const statusText = ax.response?.statusText ?? 'Unknown';
                const msg = status
                    ? `API Error: ${status} ${statusText}${apiMessage ? ` - ${apiMessage}` : ''}`
                    : apiMessage || ax.message || 'Đã xảy ra lỗi không xác định';
                throw new ApiClientError<IApiErrorPayload>(msg, status, statusText, ax.response?.data);
            }
            // Lỗi không phải Axios
            throw err;
        }
    }

    public get<T>(endpoint: string, config?: Omit<AxiosRequestConfig, 'url' | 'method'>): Promise<T> {
        return this.request<T>({ url: endpoint, method: 'GET', ...config });
    }

    public post<T, D = unknown>(endpoint: string, data?: D, config?: Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>): Promise<T> {
        return this.request<T>({ url: endpoint, method: 'POST', data, ...config });
    }

    public put<T, D = unknown>(endpoint: string, data?: D, config?: Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>): Promise<T> {
        return this.request<T>({ url: endpoint, method: 'PUT', data, ...config });
    }

    public patch<T, D = unknown>(endpoint: string, data?: D, config?: Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>): Promise<T> {
        return this.request<T>({ url: endpoint, method: 'PATCH', data, ...config });
    }

    public delete<T>(endpoint: string, config?: Omit<AxiosRequestConfig, 'url' | 'method'>): Promise<T> {
        return this.request<T>({ url: endpoint, method: 'DELETE', ...config });
    }

    // ---- Upload có progress (type-safe)
    async upload<T>(
        endpoint: string,
        formData: FormData,
        onProgress?: (progressPercent: number, raw?: AxiosProgressEvent) => void,
        signal?: AbortSignal
    ): Promise<T> {
        return this.request<T>({
            url: endpoint,
            method: 'POST',
            data: formData,
            headers: new AxiosHeaders({ 'Content-Type': 'multipart/form-data' }),
            onUploadProgress: (pe: AxiosProgressEvent) => {
                if (onProgress && pe.total) {
                    const pct = Math.round((pe.loaded * 100) / pe.total);
                    onProgress(pct, pe);
                }
            },
            signal,
        });
    }

    // ---- Utilities
    setBaseURL(baseURL: string): void {
        this.instance.defaults.baseURL = baseURL;
    }

    setTimeout(timeout: number): void {
        this.instance.defaults.timeout = timeout;
    }

    destroy(): void {
        if (this.reqInterceptorId !== undefined) {
            this.instance.interceptors.request.eject(this.reqInterceptorId);
            this.reqInterceptorId = undefined;
        }
        if (this.resInterceptorId !== undefined) {
            this.instance.interceptors.response.eject(this.resInterceptorId);
            this.resInterceptorId = undefined;
        }
        this.refreshPromise = null;
    }

    getConfig() {
        return {
            ...this.options, // spread trước
            baseURL: this.instance.defaults.baseURL,
            timeout: this.instance.defaults.timeout,
        };
    }
}

export default ApiBaseService;

/* export const apiClient = new ApiClient({
    baseURL: API_BASE,
    enableLogging: process.env.NODE_ENV === 'development',
    retryAttempts: 3,
    retryDelay: 1_000,
    timeout: 30_000,
    onUnauthorized: () => {
        if (typeof window !== 'undefined') window.location.href = '/login';
    },
    // Ví dụ cách implement refresh token:
    // onTokenRefresh: async () => {
    //   const refreshToken = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN, '');
    //   const res = await fetch('/api/auth/refresh', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ refreshToken }),
    //     credentials: 'include',
    //   });
    //   if (!res.ok) throw new Error('Refresh failed');
    //   const data: { accessToken: string } = await res.json();
    //   return data.accessToken;
    // },
});

 */


// ---- Factory & default instance
//export const createApiClient = (options: ApiClientOptions) => new ApiClient(options);



