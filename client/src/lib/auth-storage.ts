const localTokenKey = "aroma.portal.token";
const sessionTokenKey = "aroma.portal.session-token";

const canUseStorage = (): boolean => typeof window !== "undefined";

export const getStoredToken = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  return (
    window.localStorage.getItem(localTokenKey) ??
    window.sessionStorage.getItem(sessionTokenKey)
  );
};

export const storeToken = (token: string, remember: boolean): void => {
  if (!canUseStorage()) {
    return;
  }

  clearStoredToken();
  if (remember) {
    window.localStorage.setItem(localTokenKey, token);
    return;
  }

  window.sessionStorage.setItem(sessionTokenKey, token);
};

export const clearStoredToken = (): void => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(localTokenKey);
  window.sessionStorage.removeItem(sessionTokenKey);
};
