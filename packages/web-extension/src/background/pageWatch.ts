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

/**
 * Call `pageGone(tabId)` when a tab's top-frame document goes away or the tab
 * closes. The recorder decides whether that tab is the one it records.
 */
export function watchRecordedPages(
  events: {
    onConnect: PageEvent<(port: PagePort) => void>;
    onTabRemoved: PageEvent<(tabId: number) => void>;
  },
  pageGone: (tabId: number) => void,
) {
  events.onConnect.addListener((port) => {
    const tabId = port.sender?.tab?.id;
    if (port.name !== RECORDED_PAGE_PORT || tabId === undefined) return;
    if (port.sender?.frameId !== 0) return;
    port.onDisconnect.addListener(() => pageGone(tabId));
  });
  events.onTabRemoved.addListener((tabId) => pageGone(tabId));
}
