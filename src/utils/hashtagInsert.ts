export function insertHashtagAtCursor(
  textarea: HTMLTextAreaElement | null,
  content: string,
  hashtag: string,
  setContent: (value: string) => void,
) {
  const tag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
  if (content.toLowerCase().includes(tag.toLowerCase())) {
    return;
  }

  if (!textarea) {
    const spacer = content.length > 0 && !content.endsWith(' ') && !content.endsWith('\n') ? ' ' : '';
    setContent(`${content}${spacer}${tag}`);
    return;
  }

  const start = textarea.selectionStart ?? content.length;
  const end = textarea.selectionEnd ?? content.length;
  const prefix = content.slice(0, start);
  const suffix = content.slice(end);
  const spacer = prefix.length > 0 && !prefix.endsWith(' ') && !prefix.endsWith('\n') ? ' ' : '';
  const insertion = `${spacer}${tag}`;
  const next = `${prefix}${insertion}${suffix}`;
  setContent(next);

  requestAnimationFrame(() => {
    textarea.focus();
    const pos = start + insertion.length;
    textarea.setSelectionRange(pos, pos);
  });
}
