// utils/storage.ts
export const storage = {
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },

  getItem: (key: string, defaultValue: string = ''): string => {
    try {
      return localStorage.getItem(key) ?? defaultValue;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return defaultValue;
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },
};
