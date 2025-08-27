/**
 * @interface ILoginCredentials
 * Định nghĩa cấu trúc dữ liệu cần thiết cho việc đăng nhập.
 */
export interface ILoginCredentials {
  username: string;      // Email hoặc username dùng để đăng nhập
  password: string;   // Mật khẩu
}

/**
 * @interface IRegisterData
 * Định nghĩa cấu trúc dữ liệu cần thiết cho việc đăng ký tài khoản mới.
 */
export interface IRegisterData {
  name: string;                 // Tên của người dùng
  email: string;                // Email đăng ký, phải là duy nhất
  password: string;             // Mật khẩu, nên có yêu cầu về độ phức tạp
  passwordConfirm: string;      // Trường để xác nhận lại mật khẩu, giúp tránh gõ nhầm
  age: string;            // URL ảnh đại diện, có thể có hoặc không (optional)
  gender: string;          // Ngày tạo tài khoản
  address: string;
}


/**
 * @interface IUser
 * Định nghĩa cấu trúc của đối tượng người dùng mà API trả về sau khi
 * đăng nhập hoặc đăng ký thành công.
 */
export interface IUser {
  id: string | number;        // ID định danh duy nhất của người dùng
  name: string;
  email: string;
  age: string;            // URL ảnh đại diện, có thể có hoặc không (optional)
  gender: string;          // Ngày tạo tài khoản
  address: string;
}