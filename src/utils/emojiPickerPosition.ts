/** Default @emoji-mart/react picker dimensions */
export const EMOJI_PICKER_WIDTH = 352;
export const EMOJI_PICKER_HEIGHT = 435;

const GAP = 8;
const VIEWPORT_PADDING = 8;

export interface EmojiPickerPosition {
  top: number;
  right: number;
  maxHeight: number;
}

export function computeEmojiPickerPosition(anchorRect: DOMRect): EmojiPickerPosition {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const spaceAbove = anchorRect.top - VIEWPORT_PADDING - GAP;
  const spaceBelow = vh - anchorRect.bottom - VIEWPORT_PADDING - GAP;

  let top: number;
  let maxHeight: number;

  if (spaceAbove >= EMOJI_PICKER_HEIGHT) {
    top = anchorRect.top - GAP - EMOJI_PICKER_HEIGHT;
    maxHeight = EMOJI_PICKER_HEIGHT;
  } else if (spaceBelow >= EMOJI_PICKER_HEIGHT) {
    top = anchorRect.bottom + GAP;
    maxHeight = EMOJI_PICKER_HEIGHT;
  } else if (spaceBelow >= spaceAbove) {
    top = anchorRect.bottom + GAP;
    maxHeight = Math.max(160, spaceBelow);
  } else {
    maxHeight = Math.max(160, spaceAbove);
    top = anchorRect.top - GAP - maxHeight;
  }

  top = Math.max(VIEWPORT_PADDING, Math.min(top, vh - maxHeight - VIEWPORT_PADDING));

  let right = vw - anchorRect.right;
  if (vw - right - EMOJI_PICKER_WIDTH < VIEWPORT_PADDING) {
    right = vw - EMOJI_PICKER_WIDTH - VIEWPORT_PADDING;
  }
  right = Math.max(VIEWPORT_PADDING, right);

  return { top, right, maxHeight };
}
