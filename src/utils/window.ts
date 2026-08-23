export { getActiveWindow, isWindowAlive };

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
