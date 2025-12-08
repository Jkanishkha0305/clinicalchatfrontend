export function showToast(type: 'success' | 'error' | 'info', message: string, options?: { title?: string; duration?: number }) {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(type, message, options);
  }
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTitleFromText(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return 'New Chat';
  const firstWords = words.slice(0, 4).join(' ');
  return firstWords || 'New Chat';
}

