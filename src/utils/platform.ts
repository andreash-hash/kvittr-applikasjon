export const isMobileApp = (): boolean => {
  try {
    return (
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.() === true
    );
  } catch {
    return false;
  }
};

export const getMobilePlatform = (): string => {
  try {
    return (typeof window !== "undefined" && (window as any).Capacitor?.getPlatform?.()) || "web";
  } catch {
    return "web";
  }
};
