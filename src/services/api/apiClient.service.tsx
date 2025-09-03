/**
 * @file Triển khai một API client mạnh mẽ sử dụng Axios với các tính năng như interceptors,
 * làm mới token, và thử lại yêu cầu với thuật toán exponential backoff.
 */

import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosProgressEvent } from 'axios';
import persistence from '@app/utils/storage';
import { STORAGE_KEYS } from '@app/utils/constants';
import { type IApiClientOptions, type IApiErrorPayload } from '@app/types/api';
import { ApiClientError } from '@app/services/api/apiClientError.service';

/**
 * Một API client toàn diện được xây dựng dựa trên Axios.
 */
class ApiClient {
    private readonly instance: AxiosInstance;
    private readonly options: Required<Omit<IApiClientOptions, 'onUnauthorized' | 'onTokenRefresh'>> &
        Pick<IApiClientOptions, 'onUnauthorized' | 'onTokenRefresh'>;

    private refreshPromise: Promise<string> | null = null;
    private requestInterceptorId?: number;
    private responseInterceptorId?: number;

    /**
     * Tạo một thực thể của ApiClient.
     * @param options - Các tùy chọn cấu hình cho client, có thể là một chuỗi URL cơ sở hoặc một đối tượng tùy chọn.
     */
    constructor(options: IApiClientOptions | string) {
        const normalizedOptions: IApiClientOptions =
            typeof options === 'string' ? { baseURL: options } : options;

        this.options = {
            timeout: 30_000,
            enableLogging: false,
            retryAttempts: 3,
            retryDelay: 1_000,
            ...normalizedOptions,
        };

        this.instance = axios.create({
            baseURL: this.options.baseURL,
            timeout: this.options.timeout,
            withCredentials: true,
            headers: new AxiosHeaders({ 'Content-Type': 'application/json' }),
        });

        this.setupInterceptors();
    }

    /**
     * Thiết lập các interceptor cho request và response của Axios.
     */
    private setupInterceptors(): void {
        this.requestInterceptorId = this.instance.interceptors.request.use(
            (config) => {
                const token = persistence.local.getItem(STORAGE_KEYS.AUTH_TOKEN, '');
                if (token) {
                    this.setAuthHeader(config, token);
                }
                if (this.options.enableLogging) {
                    console.log(`🚀 Yêu cầu API: ${config.method?.toUpperCase()} ${config.url}`);
                }
                return config;
            },
            (err: unknown) => {
                if (this.options.enableLogging) console.error('❌ Lỗi Yêu cầu:', err);
                return Promise.reject(err);
            }
        );

        this.responseInterceptorId = this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                if (this.options.enableLogging) {
                    console.log(`✅ Phản hồi API: ${response.status} ${response.config.url}`);
                }
                return response;
            },
            async (error: AxiosError<IApiErrorPayload>) => {
                if (this.options.enableLogging) {
                    console.error('❌ Lỗi Phản hồi:', error.config?.url, error.response?.status, error.message);
                }
                // Xử lý lỗi 401 Unauthorized để làm mới token
                if (error.response?.status === 401) {
                    return this.handle401Error(error);
                }
                // Đối với tất cả các lỗi khác, từ chối với một ApiClientError đã được chuẩn hóa
                return Promise.reject(this.createApiError(error));
            }
        );
    }

    /**
     * Xử lý lỗi 401 Unauthorized, cố gắng làm mới token nếu được cấu hình.
     * @param error - AxiosError ban đầu.
     * @returns Một promise giải quyết với một AxiosResponse mới nếu yêu cầu có thể được thử lại, hoặc bị từ chối.
     */
    private async handle401Error(error: AxiosError<IApiErrorPayload>): Promise<AxiosResponse> {
        // Nếu có cung cấp hàm làm mới token, hãy thử làm mới.
        if (this.options.onTokenRefresh) {
            // Sử dụng một promise duy nhất để ngăn chặn nhiều lệnh gọi làm mới đồng thời.
            if (!this.refreshPromise) {
                this.refreshPromise = this.options.onTokenRefresh();
            }
            try {
                const newToken = await this.refreshPromise;
                persistence.local.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
                const originalConfig = error.config;
                if (originalConfig) {
                    this.setAuthHeader(originalConfig, newToken);
                    // Thử lại yêu cầu ban đầu với token mới.
                    return this.instance.request(originalConfig);
                }
            } catch (refreshErr) {
                if (this.options.enableLogging) {
                    console.error('Làm mới token thất bại:', refreshErr);
                }
                // Nếu làm mới thất bại, thực hiện các hành động đăng xuất/không được phép.
                this.handleLogout();
                // Từ chối với một lỗi cụ thể cho việc làm mới thất bại.
                return Promise.reject(new ApiClientError('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 401));
            } finally {
                this.refreshPromise = null;
            }
        } else {
            // Nếu không có trình xử lý làm mới, chỉ cần đăng xuất.
            this.handleLogout();
        }

        // Nếu đến đây, yêu cầu không thể được phục hồi, vì vậy chúng ta từ chối.
        // Ưu tiên thông báo lỗi gốc từ API nếu có, thay vì luôn dùng một thông báo cứng.
        // Điều này linh hoạt hơn cho các trường hợp 401 không phải do token hết hạn (ví dụ: token không hợp lệ).
        return Promise.reject(this.createApiError(error));
    }

    /**
     * Thực thi logic đăng xuất bằng cách xóa bộ nhớ và gọi callback onUnauthorized.
     */
    private handleLogout(): void {
        persistence.local.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        this.options.onUnauthorized?.();
    }

    /**
     * Phương thức yêu cầu cốt lõi với logic thử lại.
     * @template T - Kiểu dữ liệu phản hồi mong đợi.
     * @param config - Cấu hình yêu cầu của Axios.
     * @param retryCount - Số lần thử lại hiện tại.
     * @returns Một promise giải quyết với dữ liệu phản hồi.
     */
    private async request<T>(config: AxiosRequestConfig, retryCount = 0): Promise<T> {
        try {
            const res = await this.instance.request<T>(config);
            return res.data;
        } catch (err: unknown) {
            // Interceptor xử lý hầu hết các lỗi, nhưng khối catch này xử lý các lần thử lại và các lỗi không phải của Axios.
            const isAxios = axios.isAxiosError(err);
            const status = isAxios ? err.response?.status : undefined;

            const canRetry =
                retryCount < this.options.retryAttempts &&
                status !== 401 && // Lỗi 401 được xử lý bởi interceptor, không cần thử lại ở đây.
                (!isAxios || this.isRetryableError(err));

            if (canRetry) {
                const delayMs = this.options.retryDelay * Math.pow(2, retryCount);
                if (this.options.enableLogging) {
                    console.warn(`⏳ Đang thử lại yêu cầu... (${retryCount + 1}/${this.options.retryAttempts}) trong ${delayMs}ms`);
                }
                await new Promise((r) => setTimeout(r, delayMs));
                return this.request<T>(config, retryCount + 1);
            }

            // Nếu lỗi không thể thử lại, ném lại nó.
            // Nếu đó là AxiosError, nó đáng lẽ đã được chuyển đổi bởi interceptor.
            // Nếu không, chúng ta chuyển đổi nó ngay bây giờ.
            if (isAxios && !(err instanceof ApiClientError)) {
                throw this.createApiError(err as AxiosError<IApiErrorPayload>);
            }
            throw err;
        }
    }

    // --- Các phương thức API công khai ---

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

    /**
     * Thực hiện tải lên tệp bằng FormData.
     * @template T - Kiểu dữ liệu phản hồi mong đợi.
     * @param endpoint - URL điểm cuối để tải lên.
     * @param formData - Đối tượng FormData chứa (các) tệp và dữ liệu khác.
     * @param onProgress - Một callback tùy chọn để theo dõi tiến trình tải lên (0-100).
     * @param signal - Một AbortSignal tùy chọn để hủy yêu cầu.
     * @returns Một promise giải quyết với dữ liệu phản hồi.
     */
    public async upload<T>(
        endpoint: string,
        formData: FormData,
        onProgress?: (progressPercent: number) => void,
        signal?: AbortSignal
    ): Promise<T> {
        return this.request<T>({
            url: endpoint,
            method: 'POST',
            data: formData,
            headers: new AxiosHeaders({ 'Content-Type': 'multipart/form-data' }),
            onUploadProgress: (pe: AxiosProgressEvent) => {
                if (onProgress && pe.total) {
                    const percent = Math.round((pe.loaded * 100) / pe.total);
                    onProgress(percent);
                }
            },
            signal,
        });
    }

    // --- Tiện ích và Hàm trợ giúp ---

    /**
     * Gỡ bỏ các interceptor để dọn dẹp thực thể. Hữu ích cho việc kiểm thử hoặc các môi trường động.
     */
    public destroy(): void {
        if (this.requestInterceptorId !== undefined) {
            this.instance.interceptors.request.eject(this.requestInterceptorId);
        }
        if (this.responseInterceptorId !== undefined) {
            this.instance.interceptors.response.eject(this.responseInterceptorId);
        }
    }

    /**
     * Đặt header 'Authorization' vào cấu hình yêu cầu của Axios.
     */
    private setAuthHeader(config: AxiosRequestConfig, token: string): void {
        const headers = new AxiosHeaders(config.headers);
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
    }

    /**
     * Xác định xem một lỗi Axios có thể thử lại được hay không (lỗi mạng hoặc lỗi máy chủ 5xx).
     */
    private isRetryableError(err: AxiosError): boolean {
        const status = err.response?.status;
        return !status || (status >= 500 && status < 600);
    }

    /**
     * Tạo một ApiClientError đã được chuẩn hóa từ một AxiosError.
     * @param axError - AxiosError nguồn.
     * @param overrideMessage - Một thông báo tùy chọn để sử dụng thay vì thông báo từ API.
     * @returns Một thực thể của ApiClientError.
     */
    private createApiError(axError: AxiosError<IApiErrorPayload>, overrideMessage?: string): ApiClientError<IApiErrorPayload> {
        const res = axError.response;
        const apiMessage = res?.data?.message ?? res?.data?.error;
        const message = overrideMessage
            ?? apiMessage
            ?? `Lỗi API: ${res?.status ?? 'Không xác định'} ${res?.statusText ?? axError.message}`;

        return new ApiClientError<IApiErrorPayload>(message, res?.status, res?.statusText, res?.data);
    }
}

export default ApiClient;

