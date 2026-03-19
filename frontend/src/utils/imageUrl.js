export const toSafeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  // Prevent dev-server URI parse crashes for URLs containing invalid percent escapes.
  return trimmed.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
};
