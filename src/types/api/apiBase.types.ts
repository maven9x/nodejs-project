/**
 * @file Chứa các định nghĩa kiểu dữ liệu cho dịch vụ API client.
 */

/**
 * Định nghĩa cấu trúc cho payload lỗi được trả về bởi API.
 * Đây là một ví dụ chung và nên được điều chỉnh để phù hợp với phản hồi lỗi thực tế của API của bạn.
 */
export interface IApiErrorPayload {
    message?: string;
    error?: string; // Một số API sử dụng 'error' thay vì 'message'
    [key: string]: any; // Cho phép các thuộc tính khác
}

/**
 * Định nghĩa các tùy chọn cấu hình cho constructor của ApiClient.
 */
export interface IApiClientOptions {
    /** URL cơ sở cho tất cả các yêu cầu API. */
    baseURL: string;
    /** Thời gian chờ cho các yêu cầu (tính bằng mili giây). Mặc định là 30,000ms. */
    timeout?: number;
    /** Bật/tắt việc ghi log ra console cho các yêu cầu và phản hồi. Mặc định là false. */
    enableLogging?: boolean;
    /** Số lần thử lại một yêu cầu thất bại. Mặc định là 3. */
    retryAttempts?: number;
    /** Thời gian trễ cơ sở (tính bằng mili giây) cho các lần thử lại (sẽ được nhân theo cấp số nhân). Mặc định là 1000ms. */
    retryDelay?: number;
    /**
     * Một hàm callback tùy chọn được gọi khi một yêu cầu thất bại do không được phép (ví dụ: sau khi làm mới token thất bại).
     * Thường được sử dụng để chuyển hướng người dùng đến trang đăng nhập.
     */
    onUnauthorized?: () => void;
    /**
     * Một hàm bất đồng bộ tùy chọn để làm mới token xác thực.
     * Hàm này nên trả về một promise giải quyết với token truy cập mới.
     * Nếu nó bị từ chối (reject), người dùng sẽ được coi là không được phép.
     */
    onTokenRefresh?: () => Promise<string>;
}
