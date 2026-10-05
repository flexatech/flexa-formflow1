/**
 * Email previews render server HTML inside an iframe. The document's default
 * body margin (plus full-width wrapper tables) pushes a ~600px email a few
 * pixels past the frame, so the preview grows a horizontal scrollbar. These
 * rules zero the margin and clip horizontal overflow while leaving vertical
 * scrolling untouched, so tall emails still scroll down but never sideways.
 */
export const PREVIEW_RESET_CSS = "html{overflow-x:hidden}html,body{margin:0}";

/** Prepend the reset so an iframe `srcDoc` preview never scrolls sideways. */
export function withPreviewReset(html: string): string {
    return `<style>${PREVIEW_RESET_CSS}</style>${html}`;
}
