/**
 * @interface IApiError
 * Định nghĩa cấu trúc chuẩn cho một đối tượng lỗi trả về từ API.
 */
export interface IApiError {
  /**
   * Nội dung chi tiết của lỗi.
   * Có thể là một chuỗi đơn lẻ (ví dụ: "Email đã tồn tại")
   * hoặc một mảng các chuỗi (khi có nhiều lỗi validation).
   */
  message: string | string[];

  /**
   * Tên ngắn gọn của lỗi, thường tương ứng với status code.
   * Ví dụ: "Bad Request", "Not Found", "Unauthorized".
   */
  error: string;

  /**
   * Mã trạng thái HTTP.
   * Ví dụ: 400, 401, 404, 500.
   */
  statusCode: number;
}