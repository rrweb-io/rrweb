/**
 * Get the content document of an iframe.
 * Catching errors is necessary because some older browsers block access to the content document of a sandboxed iframe.
 */
export function getIFrameContentDocument(iframe?: HTMLIFrameElement) {
  try {
    return (iframe as HTMLIFrameElement).contentDocument;
  } catch (e) {
    // noop
  }
}

/**
 * Get the content window of an iframe.
 * Catching errors is necessary because some older browsers block access to the content document of a sandboxed iframe.
 */
export function getIFrameContentWindow(iframe?: HTMLIFrameElement) {
  try {
    return (iframe as HTMLIFrameElement).contentWindow;
  } catch (e) {
    // noop
  }
}
