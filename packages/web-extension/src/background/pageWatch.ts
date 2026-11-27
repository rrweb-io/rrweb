/**
 * The content script opens a port with this name when it loads into a tab's
 * top frame. The browser closes the port when that document goes away: a
 * navigation to a new document, a reload, or the tab closing. Same-document
 * changes (a hash change or `pushState`) keep the document, so the port stays
 * open. This needs no permission beyond the injection itself.
 */
export const RECORDED_PAGE_PORT = 'rrweb-recorded-page';

type PageEvent<Listener> = { addListener(listener: Listener): void };

type PagePort = {
  name: string;
  sender?: { tab?: { id?: number }; frameId?: number };
  onDisconnect: PageEvent<() => void>;
};

/** What the recorder hears about a tab's pages. */
export type PageListener = {
  /** The top-frame document the content script was loaded into went away. */
  documentGone: (tabId: number) => void;
  /** A tab finished loading its top-frame document. */
  documentLoaded: (tabId: number) => void;
  tabClosed: (tabId: number) => void;
};

/**
 * Tell `listener` about every tab's pages. The recorder decides whether the
 * tab is the one it records. `onTabUpdated` reports a tab's load status
 * without the `tabs` permission.
 */
export function watchRecordedPages(
  events: {
    onConnect: PageEvent<(port: PagePort) => void>;
    onTabUpdated: PageEvent<
      (tabId: number, change: { status?: string }) => void
    >;
    onTabRemoved: PageEvent<(tabId: number) => void>;
  },
  listener: PageListener,
) {
  events.onConnect.addListener((port) => {
    const tabId = port.sender?.tab?.id;
    if (port.name !== RECORDED_PAGE_PORT || tabId === undefined) return;
    if (port.sender?.frameId !== 0) return;
    port.onDisconnect.addListener(() => listener.documentGone(tabId));
  });
  events.onTabUpdated.addListener((tabId, change) => {
    if (change.status === 'complete') listener.documentLoaded(tabId);
  });
  events.onTabRemoved.addListener((tabId) => listener.tabClosed(tabId));
}
