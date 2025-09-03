import { useContext } from 'react';

import { AuthContext, type IAuthContext } from '@app/contexts/AuthContext'; // Import từ file context


/**
 * Custom hook để truy cập AuthContext một cách dễ dàng và an toàn.
 * Đảm bảo component đang dùng hook này nằm bên trong một AuthProvider.
 */
export const useAuth = (): IAuthContext => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth phải được sử dụng trong một AuthProvider');
    }

    return context;
};