
import type { IApiError } from '@app/types/api';
/**
 * Lớp lỗi tùy chỉnh để biểu diễn các lỗi đến từ API Client.
 * Nó mở rộng lớp Error sẵn có của JavaScript và thêm các thông tin
 * về HTTP status và dữ liệu lỗi trả về từ server.
 *
 * @template T - Kiểu dữ liệu của payload lỗi (`data`), mặc định là IApiError.
 */
export class ApiClientError<T = IApiError> extends Error {
  /**
   * Mã trạng thái HTTP (ví dụ: 400, 404, 500).
   */
  public readonly status?: number;

  /**
   * Chuỗi trạng thái HTTP (ví dụ: "Bad Request", "Not Found").
   */
  public readonly statusText?: string;

  /**
   * Payload dữ liệu lỗi do server trả về, có kiểu là T (mặc định là IApiError).
   */
  public readonly data?: T;

  /**
   * Khởi tạo một instance của ApiClientError.
   * @param message - Thông báo lỗi chính, sẽ được gán cho thuộc tính `message` của Error.
   * @param status - Mã trạng thái HTTP.
   * @param statusText - Chuỗi trạng thái HTTP.
   * @param data - Payload dữ liệu lỗi từ server.
   */
  constructor(message: string, status?: number, statusText?: string, data?: T) {
    super(message);
    this.name = 'ApiClientError'; // Giúp xác định loại lỗi khi debug
    this.status = status;
    this.statusText = statusText;
    this.data = data;

    // Đảm bảo prototype chain hoạt động đúng cách
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}