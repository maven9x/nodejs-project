import { useState, useEffect, type ReactNode } from 'react';
import persistence from '@app/utils/storage';
import { STORAGE_KEYS } from '@app/utils/constants';
import type { IUser } from '@app/types/api';
import { AuthContext, type IAuthContext } from '@app/contexts/AuthContext';



export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<IUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = persistence.local.getItem(STORAGE_KEYS.USER);
            const token = persistence.local.getItem(STORAGE_KEYS.AUTH_TOKEN);

            if (storedUser && token) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Không thể khôi phục phiên đăng nhập:", error);
            persistence.local.clear();
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = (userData: IUser, accessToken: string, refreshToken: string, rememberMe: boolean) => {
        const storage = rememberMe ? persistence.local : persistence.session;

        storage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        persistence.local.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        persistence.local.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        persistence.local.removeItem(STORAGE_KEYS.USER);
        persistence.session.clear();
        setUser(null);
    };

    const value: IAuthContext = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};