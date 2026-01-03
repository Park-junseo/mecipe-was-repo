export const isPrimitive = (value) =>
  (typeof value !== 'object' && typeof value !== 'function') || value === null;
