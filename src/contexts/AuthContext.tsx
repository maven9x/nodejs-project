import { createContext } from 'react';


// Định nghĩa kiểu dữ liệu cho thông tin người dùng
interface IUser {
    id: number;
    name: string;
    email: string;
    // Thêm các thuộc tính khác nếu cần
}

// Định nghĩa kiểu dữ liệu cho giá trị của Context
export interface IAuthContext {
    user: IUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (user: IUser, accessToken: string, refreshToken: string, rememberMe: boolean) => void;
    logout: () => void;
}

// Tạo và export Context
export const AuthContext = createContext<IAuthContext | undefined>(undefined);

