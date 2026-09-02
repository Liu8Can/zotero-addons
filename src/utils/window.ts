export { getActiveWindow, isWindowAlive, resolveProgressWindowOwner };

/**
 * Check if the window is alive.
 * Useful to prevent opening duplicate windows.
 * @param win
 */
function isWindowAlive(win?: Window | null): win is Window {
  return !!win && !Components.utils.isDeadWrapper(win) && !win.closed;
}

/**
 * Return the currently active Zotero window when it is still usable.
 * This matters for dependent dialogs, which otherwise fall back to the main
 * window and can pull it in front of an add-on window on Zotero 10.
 */
function getActiveWindow(): Window | undefined {
  const win = Services.focus.activeWindow as Window | null;
  return isWindowAlive(win) ? win : undefined;
}

/**
 * Prefer an explicitly supplied owner and otherwise use the active Zotero
 * window. Keeping this decision in one place makes retries and callers with an
 * optional owner behave consistently.
 */
function resolveProgressWindowOwner(
  preferred?: Window | null,
  fallback?: Window | null,
): Window | undefined {
  if (isWindowAlive(preferred)) {
    return preferred;
  }
  const fallbackOwner =
    typeof fallback === "undefined" ? getActiveWindow() : fallback;
  return isWindowAlive(fallbackOwner) ? fallbackOwner : undefined;
}
