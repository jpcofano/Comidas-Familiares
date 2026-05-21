/**
 * Detects whether the device is a real desktop (no touch) vs touch/mobile.
 * Returns true for desktop, false for touch devices.
 * Runs once at app start; the result is added as a class on document.body
 * so CSS can react via body.is-desktop.
 *
 * Same technique as the Apps Script Styles.html — feature detection via
 * ontouchstart + maxTouchPoints, not media queries (which lie inside
 * embedded WebViews).
 */
export function detectAndMarkDesktop(): void {
  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error legacy IE
    navigator.msMaxTouchPoints > 0;

  if (!isTouch) {
    document.body.classList.add("is-desktop");
  }
}
