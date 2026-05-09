export function buildTileTemplate(baseUrl: string, cacheBuster?: string) {
  const [path, query] = baseUrl.split('?', 2);
  const template = `${path}/{z}/{x}/{y}${query ? `?${query}` : ''}`;

  if (!cacheBuster) {
    return template;
  }

  const separator = template.includes('?') ? '&' : '?';
  return `${template}${separator}v=${encodeURIComponent(cacheBuster)}`;
}
