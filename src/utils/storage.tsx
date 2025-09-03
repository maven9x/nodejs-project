/**
 * @file Triển khai tiện ích lưu trữ linh hoạt, hỗ trợ localStorage, sessionStorage, và cookies.
 * Cung cấp một lớp trừu tượng để dễ dàng làm việc với các cơ chế lưu trữ khác nhau.
 * Tự động quay về lưu trữ trong bộ nhớ nếu cơ chế yêu cầu không khả dụng.
 */

/**
 * Định nghĩa các loại cơ chế lưu trữ được hỗ trợ.
 * Sử dụng một đối tượng với 'as const' để đảm bảo tương thích rộng rãi, thay thế cho enum.
 */
const StorageType = {
    LocalStorage: 'local',
    SessionStorage: 'session',
    Cookie: 'cookie',
} as const;

// Tạo ra một kiểu (type) từ các giá trị của đối tượng StorageType ở trên.
type StorageTypeValue = typeof StorageType[keyof typeof StorageType];


// --- Trình xử lý Cookie ---
// Một đối tượng trợ giúp để trừu tượng hóa các thao tác với cookie,
// làm cho nó có giao diện giống với Storage API (getItem, setItem, removeItem).
const cookieHandler = {
    /**
     * Đặt một cookie.
     * @param key - Khóa của cookie.
     * @param value - Giá trị của cookie.
     * @param days - Số ngày cho đến khi cookie hết hạn. Mặc định là 7.
     */
    setItem(key: string, value: string, days: number = 7): void {
        if (typeof document === 'undefined') return;
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = `${key}=${value || ""}${expires}; path=/; SameSite=Lax; Secure`;
    },

    /**
     * Lấy giá trị của một cookie.
     * @param key - Khóa của cookie cần lấy.
     * @returns Giá trị của cookie, hoặc `null` nếu không tìm thấy.
     */
    getItem(key: string): string | null {
        if (typeof document === 'undefined') return null;
        const nameEQ = key + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },

    /**
     * Xóa một cookie.
     * @param key - Khóa của cookie cần xóa.
     */
    removeItem(key: string): void {
        if (typeof document === 'undefined') return;
        // Để xóa cookie, chúng ta đặt ngày hết hạn của nó về quá khứ.
        document.cookie = `${key}=; Max-Age=-99999999; path=/`;
    },

    /**
     * Việc xóa tất cả các cookie một cách đáng tin cậy là không khả thi từ phía client.
     * Phương thức này chỉ ghi một cảnh báo.
     */
    clear(): void {
        console.warn("Phương thức `clear` không được hỗ trợ một cách đáng tin cậy cho CookieStorage.");
    }
};

class PersistenceStorage {
    private storage: globalThis.Storage | typeof cookieHandler | Map<string, string>;
    private storageType: StorageTypeValue | 'memory';

    /**
     * Khởi tạo một thực thể lưu trữ.
     * @param type - Loại lưu trữ mong muốn (local, session, hoặc cookie).
     */
    constructor(type: StorageTypeValue) {
        this.storageType = type;

        switch (type) {
            case StorageType.LocalStorage:
                this.storage = this.isStorageAvailable('localStorage') ? window.localStorage : new Map();
                break;
            case StorageType.SessionStorage:
                this.storage = this.isStorageAvailable('sessionStorage') ? window.sessionStorage : new Map();
                break;
            case StorageType.Cookie:
                 this.storage = this.isCookieAvailable() ? cookieHandler : new Map();
                break;
            default:
                // Trường hợp này không nên xảy ra với TypeScript, nhưng vẫn là một biện pháp an toàn.
                this.storage = new Map<string, string>();
        }
        
        // Nếu phải dùng đến Map, nghĩa là cơ chế lưu trữ gốc không khả dụng
        if (this.storage instanceof Map) {
            this.storageType = 'memory';
            console.warn(
                `Cảnh báo: ${type} storage không khả dụng. ` +
                'Dữ liệu sẽ được lưu trữ tạm thời và mất khi tải lại trang.'
            );
        }
    }

    /**
     * Kiểm tra xem một loại Web Storage có khả dụng không.
     * @param type - 'localStorage' hoặc 'sessionStorage'.
     * @returns `true` nếu có sẵn, ngược lại là `false`.
     */
    private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
        try {
            if (typeof window === 'undefined' || typeof window[type] === 'undefined') {
                return false;
            }
            const storage = window[type];
            const testKey = '__test_storage__';
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Kiểm tra xem cookie có được bật trong trình duyệt hay không.
     * @returns `true` nếu cookie được bật, ngược lại là `false`.
     */
    private isCookieAvailable(): boolean {
        if (typeof navigator === 'undefined' || !navigator.cookieEnabled) {
            return false;
        }
        // Thêm một bước kiểm tra thực tế vì navigator.cookieEnabled có thể không đáng tin cậy.
        try {
            cookieHandler.setItem('__test_cookie__', '1', 1);
            const canRead = cookieHandler.getItem('__test_cookie__') === '1';
            cookieHandler.removeItem('__test_cookie__');
            return canRead;
        } catch {
            return false;
        }
    }

    /**
     * Lấy một mục từ bộ nhớ.
     * @param key - Khóa của mục cần lấy.
     * @param defaultValue - Giá trị trả về nếu không tìm thấy khóa.
     * @returns Giá trị đã lưu hoặc giá trị mặc định.
     */
    getItem(key: string, defaultValue: string = ''): string {
        let value: string | null | undefined;
        if (this.storageType === 'memory') {
            value = (this.storage as Map<string, string>).get(key);
        } else {
            value = (this.storage as globalThis.Storage | typeof cookieHandler).getItem(key);
        }
        return value ?? defaultValue;
    }

    /**
     * Lưu một mục vào bộ nhớ.
     * @param key - Khóa để lưu mục.
     * @param value - Giá trị cần lưu.
     */
    setItem(key: string, value: string): void {
        if (this.storageType === 'memory') {
            (this.storage as Map<string, string>).set(key, value);
        } else {
            (this.storage as globalThis.Storage | typeof cookieHandler).setItem(key, value);
        }
    }

    /**
     * Xóa một mục khỏi bộ nhớ.
     * @param key - Khóa của mục cần xóa.
     */
    removeItem(key: string): void {
        if (this.storageType === 'memory') {
            (this.storage as Map<string, string>).delete(key);
        } else {
            (this.storage as globalThis.Storage | typeof cookieHandler).removeItem(key);
        }
    }

    /**
     * Xóa tất cả các mục khỏi bộ nhớ. (Lưu ý: Không được hỗ trợ đầy đủ cho cookie).
     */
    clear(): void {
        this.storage.clear();
    }
}

/**
 * Xuất ra một đối tượng duy nhất chứa các thực thể lưu trữ.
 * Cách tiếp cận này giúp đảm bảo tính tương thích với các công cụ build hiện đại
 * như Vite với React Fast Refresh, tránh các cảnh báo lint không cần thiết.
 */
const persistence = {
    local: new PersistenceStorage(StorageType.LocalStorage),
    session: new PersistenceStorage(StorageType.SessionStorage),
    cookie: new PersistenceStorage(StorageType.Cookie),
    types: StorageType,
};

export default persistence;

