export function formatLivePostStoryText(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return 'Video trực tiếp';

  const [title, ...rest] = trimmed.split(/\n\s*\n/);
  const titleText = title?.trim() || 'Video trực tiếp';
  const description = rest.join('\n\n').trim();

  if (!description) return titleText;
  return `${titleText}\n${description}`;
}

export function estimateStoryTextSize(text: string): number {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const lineCount = Math.max(lines.length, 1);
  const maxLineLen = Math.max(...lines.map((line) => line.length), 1);

  if (lineCount >= 3 || maxLineLen > 30) return 30;
  if (lineCount === 2 || maxLineLen > 22) return 36;
  if (maxLineLen > 14) return 44;
  return 52;
}

export function resolveStoryTextSize(text: string, savedSize?: number | null): number {
  const fitted = estimateStoryTextSize(text);
  if (!savedSize || savedSize <= 0) return fitted;
  return Math.min(savedSize, fitted);
}
