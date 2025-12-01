
export const STORAGE_KEYS = {
  CHAT_HISTORY: 'physics_flow_chat_history',
  USER_PROGRESS: 'physics_flow_user_progress',
  THEME_PREF: 'physics_flow_theme',
  LANG_PREF: 'physics_flow_language'
};

export const saveToStorage = (key: string, data: any): void => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
  } catch (error) {
    console.warn('Failed to save to local storage', error);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) {
      return defaultValue;
    }
    return JSON.parse(serializedData) as T;
  } catch (error) {
    console.warn('Failed to load from local storage', error);
    return defaultValue;
  }
};

export const clearStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear local storage', error);
  }
};
