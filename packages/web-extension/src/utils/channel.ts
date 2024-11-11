import mitt from 'mitt';
import Browser, { Runtime } from 'webextension-polyfill';

export type Message = EventType | ServiceType;
export type EventType = {
  type: 'event';
  event: string;
  detail: unknown;
};
export type ServiceType = {
  type: 'service';
  service: string;
  params: unknown;
};

/**
 * Channel for inter-context communication.
 *
 * A chrome extension typically contains 4 types of context: background, popup, options and content scripts.
 * Communication between these contexts relies on
 * chrome.runtime.sendMessage and chrome.tabs.sendMessage.
 *
 * This Class provides two communication model:
 *   * request/response
 *   * event trigger/listen
 * based on chrome.runtime.sendMessage and chrome.tabs.sendMessage.
 */
class Channel {
  private services = new Map<
    string,
    (params: unknown, sender: Runtime.MessageSender) => Promise<unknown>
  >();
  private emitter = mitt();
  constructor() {
    /**
     * Register message listener.
     */
    Browser.runtime.onMessage.addListener(
      ((message: string, sender: Runtime.MessageSender) => {
        const parsed = JSON.parse(message) as Message | null | undefined;
        if (!parsed || !parsed.type) {
          console.error(`Bad message: ${message}`);
          return;
        }
        switch (parsed.type) {
          case 'event':
            this.emitter.emit(parsed.event, { detail: parsed.detail, sender });
            break;
          case 'service': {
            const server = this.services.get(parsed.service);
            if (!server) break;
            return server(parsed.params, sender);
          }
          default:
            console.error(
              `Unknown message type: ${(parsed as { type: string }).type}`,
            );
            break;
        }
        return;
      }).bind(this),
    );
  }

  /**
   * Provide a service.
   *
   * @param serviceName - the name of the service, acts like a URL
   * @param serveFunction - a function to provide the service when a consumer request this service.
   * @returns a function to remove the service
   */
  public provide(
    serviceName: string,
    serveFunction: (
      params: unknown,
      sender: Runtime.MessageSender,
    ) => Promise<unknown>,
  ): () => void {
    this.services.set(serviceName, serveFunction);
    return () => {
      this.services.delete(serviceName);
    };
  }

  /**
   * Send a request and get a response.
   *
   * @param service - service name to request
   * @param params - request parameters
   * @returns service data
   */
  public request(
    serviceName: string,
    params: Record<string, unknown> | unknown,
  ) {
    const message = JSON.stringify({
      type: 'service',
      service: serviceName,
      params,
    });
    return Browser.runtime.sendMessage(message);
  }

  /**
   * Send a request to the specified tab and get a response.
   *
   * @param tabId - tab id
   * @param service - service name to request
   * @param params - request parameters
   * @returns service data
   */
  public requestToTab(
    tabId: number,
    serviceName: string,
    params: Record<string, unknown> | unknown,
  ) {
    if (!Browser.tabs || !Browser.tabs.sendMessage)
      return Promise.reject('Can not send message to tabs in current context!');
    const message = JSON.stringify({
      type: 'service',
      service: serviceName,
      params,
    });
    return Browser.tabs.sendMessage(tabId, message);
  }

  /**
   * Add an event handler.
   *
   * @param eventName - event name
   * @param handler - event handler, accepts two arguments:
   *                           detail: event detail
   *                           source: source of the event, Browser.runtime.MessageSender object
   * @returns a function to remove the handler
   */
  public on(
    event: string,
    handler: (detail: unknown, sender: Runtime.MessageSender) => unknown,
  ) {
    const emitHandler = ((data: {
      detail: unknown;
      sender: Runtime.MessageSender;
    }) => {
      handler(data.detail, data.sender);
    }) as (data: unknown) => unknown;
    return this.emitter.on(event, emitHandler);
  }

  /**
   * Emit an event.
   *
   * @param event - event name
   * @param detail - event detail
   */
  public emit(event: string, detail: unknown) {
    const message = JSON.stringify({ type: 'event', event, detail });
    void Browser.runtime.sendMessage(message);
  }

  /**
   * Emit an event to specified tabs.
   *
   * @param tabIds - tab ids
   * @param event - event name
   * @param detail - event detail
   */
  public emitToTabs(tabIds: number | number[], event: string, detail: unknown) {
    if (!Browser.tabs || !Browser.tabs.sendMessage)
      return Promise.reject('Can not send message to tabs in current context!');

    // If tabIds is a number, wrap it up with an array.
    if (typeof tabIds === 'number') {
      tabIds = [tabIds];
    }

    const message = JSON.stringify({ type: 'event', event, detail });
    tabIds.forEach((tabId) => void Browser.tabs.sendMessage(tabId, message));
  }

  public async getCurrentTabId() {
    const tabs = await Browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tabs[0].id || -1;
  }
}

export default Channel;
