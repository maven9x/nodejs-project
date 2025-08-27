import ApiBaseService from "@app/services/api/base/base.service";
import { API_BASE } from "@app/utils/constants";
import type { ILoginCredentials, IRegisterData, IUser } from "@app/types/api/auth.types";


class AuthService extends ApiBaseService {

    constructor() {
        // Khởi tạo với baseURL của API
        super({ baseURL: API_BASE });
    }

    public login(credentials: ILoginCredentials): Promise<{ user: IUser; access_token: string; refresh_token: string }> {
        // Giả sử endpoint là /auth/login
        return this.post('/auth/login', credentials);
    }

    /**
     * Gửi yêu cầu đăng ký tài khoản mới.
     * @param data - Thông tin đăng ký của người dùng.
     * @returns Promise chứa thông tin người dùng đã được tạo.
     */
    public register(data: IRegisterData): Promise<IUser> {
        // Giả sử endpoint là /auth/register
        return this.post('/auth/register', data);
    }

    /**
     * Lấy thông tin của người dùng đang đăng nhập.
     * @returns Promise chứa thông tin profile.
     */
    public getProfile(): Promise<IUser> {
        // Giả sử endpoint là /auth/me
        return this.get('/me');
    }

}

export const authService = new AuthService()