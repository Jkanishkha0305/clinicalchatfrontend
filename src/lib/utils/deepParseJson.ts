/**
 * Deep parse JSON strings that might be nested
 */
export default function deepParseJson(value: any): any {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      // Recursively parse nested JSON strings
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.keys(parsed).reduce((acc, key) => {
          acc[key] = deepParseJson(parsed[key]);
          return acc;
        }, {} as any);
      }
      return parsed;
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map(deepParseJson);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = deepParseJson(value[key]);
      return acc;
    }, {} as any);
  }

  return value;
}

