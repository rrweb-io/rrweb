import {
  EventType,
  eventWithTime,
  IncrementalSource
} from '../../src/types';

const now = Date.now();
const events: eventWithTime[] = [
  {
    type: EventType.DomContentLoaded,
    data: {},
    timestamp: now,
  },
  {
    type: EventType.Load,
    data: {},
    timestamp: now + 100,
  },
  {
    type: EventType.Meta,
    data: {
      href: 'http://localhost',
      width: 1000,
      height: 800,
    },
    timestamp: now + 100,
  },
  // full snapshot:
  {
    "data": {
      "node": {
        "id": 1, "type": 0, "childNodes": [{ "id": 2, "name": "html", "type": 1, "publicId": "", "systemId": "" }, {
          "id": 3, "type": 2, "tagName": "html", "attributes": { "lang": "en" }, "childNodes": [{
            "id": 4, "type": 2, "tagName": "head", "attributes": {}, "childNodes": [
              {
                "id": 101, "type": 2, "tagName": "style", "attributes": { "data-jss": "", "data-meta": "sk, Unthemed, Static" }, "childNodes": [{ "id": 102, "type": 3, "isStyle": true, "textContent": "\n.c01x {\n  opacity: 1;\n  transform: translateX(0);\n}\n" }]
              },
              {
                "id": 105, "type": 2, "tagName": "style", "attributes":
                  { "_cssText": ".css-1uxxxx3 { position: fixed; top: 0px; right: 0px; left: 4rem; z-index: 15; flex-shrink: 0; height: 0.25rem; overflow: hidden; background-color: rgb(17, 171, 209); }.css-1c9xxxx { height: 0.25rem; background-color: rgb(190, 232, 242); opacity: 0; transition: opacity 0.5s ease 0s; }.css-lsxxx { padding-left: 4rem; }", "data-emotion": "css" }, "childNodes": [{ "id": 106, "type": 3, "isStyle": true, "textContent": "" }]
              }]
          }, {
            "id": 107, "type": 2, "tagName": "body", "attributes": {}, "childNodes": []
          }]
        }]
      }, "initialOffset": { "top": 0, "left": 0 }
    },
    "type": EventType.FullSnapshot,
    "timestamp": now + 100
  },
  // mutation that adds stylesheet
  {
    "data": {
      "adds": [
        {
          "node": {
            "id": 255, "type": 2, "tagName": "style", "attributes": { "data-jss": "", "data-meta": "Col, Themed, Dynamic" }, "childNodes": []
          },
          "nextId": 101,
          "parentId": 4
        },
        {
          "node": {
            "id": 256, "type": 3, "isStyle": true, "textContent": "\n.c011xx {\n  padding: 1.3125rem;\n  flex: none;\n  width: 100%;\n}\n"
          },
          "nextId": null,
          "parentId": 255
        },
      ],
      "texts": [],
      "source": IncrementalSource.Mutation,
      "removes": [],
      "attributes": []
    },
    "type": EventType.IncrementalSnapshot,
    "timestamp": now + 500
  },
  // adds StyleSheetRule
  {
    "data": {
      "id": 105, "adds": [
        {
          "rule": ".css-1fbxx79{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;min-width:60rem;min-height:100vh;}",
          "index": 2
        }
      ],
      "source": IncrementalSource.StyleSheetRule
    },
    "type": EventType.IncrementalSnapshot,
    "timestamp": now + 1000
  }
];

export default events;