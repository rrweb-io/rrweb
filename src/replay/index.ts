import { rebuild } from 'rrweb-snapshot';
import { mirror } from '../utils';
import { event, EventType, incrementalData, IncrementalSource } from '../types';
import eventsStr from './events';

const events: event[] = JSON.parse(eventsStr);

function applyIncremental(d: incrementalData) {
  switch (d.source) {
    case IncrementalSource.Mutation:
    case IncrementalSource.MouseMove:
    case IncrementalSource.MouseInteraction:
      break;
    case IncrementalSource.Scroll:
      // TODO: maybe element
      window.scrollTo({
        top: d.y,
        left: d.x,
        behavior: 'smooth',
      });
      break;
    case IncrementalSource.ViewportResize:
    case IncrementalSource.Input:
    default:
  }
}

function replay() {
  const iframe = document.createElement('iframe');
  for (const event of events) {
    switch (event.type) {
      case EventType.DomContentLoaded:
        break;
      case EventType.Load:
        iframe.width = `${event.data.width}px`;
        iframe.height = `${event.data.height}px`;
        break;
      case EventType.FullSnapshot:
        const [doc, map] = rebuild(event.data.node);
        mirror.map = map;
        if (doc) {
          document.body.appendChild(iframe);
          iframe.contentDocument!.open();
          // https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
          iframe.contentDocument!.write(
            (doc as Document).documentElement.outerHTML
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>'),
          );
          iframe.contentDocument!.close();
        }
        break;
      case EventType.IncrementalSnapshot:
        applyIncremental(event.data);
        break;
      default:
    }
  }
}

export default replay;
