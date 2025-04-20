declare global {
  const builtin: {
    saveSettings: () => Promise<void>;
  };
}
