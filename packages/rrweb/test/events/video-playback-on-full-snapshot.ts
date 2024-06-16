import type { eventWithTime } from '@saola.ai/rrweb-types';

const events: eventWithTime[] = [
  { type: 0, data: {}, timestamp: 1900000001 },
  { type: 1, data: {}, timestamp: 1900000132 },
  {
    type: 4,
    data: {
      href: 'http://127.0.0.1:5500/test/html/video.html',
      width: 1600,
      height: 900,
    },
    timestamp: 1900000132,
  },
  {
    type: 2,
    data: {
      node: {
        type: 0,
        childNodes: [
          { type: 1, name: 'html', publicId: '', systemId: '', id: 2 },
          {
            type: 2,
            tagName: 'html',
            attributes: { lang: 'en' },
            childNodes: [
              {
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 5 },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: { charset: 'UTF-8' },
                    childNodes: [],
                    id: 6,
                  },
                  { type: 3, textContent: '\n    ', id: 7 },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: {
                      'http-equiv': 'X-UA-Compatible',
                      content: 'IE=edge',
                    },
                    childNodes: [],
                    id: 8,
                  },
                  { type: 3, textContent: '\n    ', id: 9 },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: {
                      name: 'viewport',
                      content: 'width=device-width, initial-scale=1.0',
                    },
                    childNodes: [],
                    id: 10,
                  },
                  { type: 3, textContent: '\n    ', id: 11 },
                  {
                    type: 2,
                    tagName: 'title',
                    attributes: {},
                    childNodes: [{ type: 3, textContent: 'Video', id: 13 }],
                    id: 12,
                  },
                  { type: 3, textContent: '\n  ', id: 14 },
                  {
                    type: 2,
                    tagName: 'script',
                    attributes: { type: 'text/javascript' },
                    childNodes: [
                      { type: 3, textContent: 'SCRIPT_PLACEHOLDER', id: 16 },
                      { type: 3, textContent: 'SCRIPT_PLACEHOLDER', id: 17 },
                      { type: 3, textContent: 'SCRIPT_PLACEHOLDER', id: 18 },
                      { type: 3, textContent: 'SCRIPT_PLACEHOLDER', id: 19 },
                      { type: 3, textContent: 'SCRIPT_PLACEHOLDER', id: 20 },
                    ],
                    id: 15,
                  },
                ],
                id: 4,
              },
              { type: 3, textContent: '\n  ', id: 21 },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 23 },
                  {
                    type: 2,
                    tagName: 'h1',
                    attributes: {},
                    childNodes: [
                      { type: 3, textContent: 'Big Buck Bunny', id: 25 },
                    ],
                    id: 24,
                  },
                  { type: 3, textContent: '\n    ', id: 26 },
                  {
                    type: 2,
                    tagName: 'video',
                    attributes: {
                      muted: '',
                      controls: '',
                      loop: '',
                      rr_mediaState: 'played',
                      rr_mediaCurrentTime: 0,
                      rr_mediaPlaybackRate: 1,
                      rr_mediaMuted: true,
                      rr_mediaVolume: 1,
                      rr_mediaLoop: true,
                    },
                    childNodes: [
                      { type: 3, textContent: '\n      ', id: 28 },
                      {
                        type: 2,
                        tagName: 'source',
                        attributes: {
                          src: '/html/assets/bunny-video.webm',
                          type: 'video/webm',
                        },
                        childNodes: [],
                        id: 29,
                      },
                      {
                        type: 3,
                        textContent:
                          '\n      Your browser does not support the video element.\n    ',
                        id: 30,
                      },
                    ],
                    id: 27,
                  },
                  { type: 3, textContent: '\n  ', id: 31 },
                ],
                id: 22,
              },
            ],
            id: 3,
          },
        ],
        id: 1,
      },
      initialOffset: { left: 0, top: 0 },
    },
    timestamp: 1900000136,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 955, y: 869, id: 3, timeOffset: 0 }] },
    timestamp: 1900006165,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 902, y: 823, id: 3, timeOffset: -451 },
        { x: 840, y: 765, id: 3, timeOffset: -400 },
        { x: 796, y: 724, id: 3, timeOffset: -350 },
        { x: 716, y: 673, id: 3, timeOffset: -267 },
        { x: 660, y: 645, id: 3, timeOffset: -217 },
        { x: 554, y: 593, id: 3, timeOffset: -167 },
        { x: 466, y: 518, id: 3, timeOffset: -101 },
        { x: 433, y: 413, id: 27, timeOffset: -51 },
        { x: 432, y: 316, id: 27, timeOffset: 0 },
      ],
    },
    timestamp: 1900006665,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 444, y: 229, id: 27, timeOffset: -435 },
        { x: 444, y: 210, id: 27, timeOffset: -385 },
        { x: 444, y: 209, id: 27, timeOffset: -335 },
        { x: 445, y: 214, id: 27, timeOffset: -235 },
        { x: 460, y: 246, id: 27, timeOffset: -185 },
        { x: 476, y: 273, id: 27, timeOffset: -134 },
        { x: 482, y: 281, id: 27, timeOffset: -84 },
      ],
    },
    timestamp: 1900007166,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 483, y: 281, id: 27, timeOffset: 0 }] },
    timestamp: 1900007814,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 483, y: 281, id: 27, timeOffset: -417 },
        { x: 484, y: 282, id: 27, timeOffset: -218 },
      ],
    },
    timestamp: 1900008315,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 484, y: 281, id: 27, timeOffset: 0 }] },
    timestamp: 1900010165,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 484, y: 281, id: 27, timeOffset: -322 },
        { x: 485, y: 281, id: 27, timeOffset: -256 },
        { x: 491, y: 282, id: 27, timeOffset: -205 },
        { x: 515, y: 283, id: 27, timeOffset: -156 },
        { x: 534, y: 285, id: 27, timeOffset: -106 },
        { x: 562, y: 291, id: 27, timeOffset: -56 },
        { x: 575, y: 295, id: 27, timeOffset: -6 },
      ],
    },
    timestamp: 1900010670,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 576, y: 296, id: 27, timeOffset: 0 }] },
    timestamp: 1900012714,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 576, y: 298, id: 27, timeOffset: -451 },
        { x: 577, y: 301, id: 27, timeOffset: -400 },
        { x: 578, y: 305, id: 27, timeOffset: -334 },
        { x: 580, y: 313, id: 27, timeOffset: -284 },
        { x: 582, y: 332, id: 27, timeOffset: -234 },
        { x: 585, y: 346, id: 27, timeOffset: -184 },
        { x: 587, y: 353, id: 27, timeOffset: -133 },
      ],
    },
    timestamp: 1900013215,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [{ x: 587, y: 354, id: 27, timeOffset: -253 }],
    },
    timestamp: 1900013717,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 587, y: 355, id: 27, timeOffset: 0 }] },
    timestamp: 1900014364,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 588, y: 358, id: 27, timeOffset: -451 },
        { x: 589, y: 368, id: 27, timeOffset: -400 },
        { x: 592, y: 386, id: 27, timeOffset: -334 },
        { x: 596, y: 402, id: 27, timeOffset: -266 },
        { x: 597, y: 410, id: 27, timeOffset: -202 },
        { x: 595, y: 415, id: 27, timeOffset: -152 },
        { x: 591, y: 417, id: 27, timeOffset: -101 },
        { x: 585, y: 418, id: 27, timeOffset: -51 },
        { x: 579, y: 418, id: 27, timeOffset: 0 },
      ],
    },
    timestamp: 1900014865,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 562, y: 420, id: 27, timeOffset: -433 },
        { x: 547, y: 422, id: 27, timeOffset: -367 },
        { x: 538, y: 423, id: 27, timeOffset: -317 },
        { x: 525, y: 423, id: 27, timeOffset: -251 },
        { x: 509, y: 423, id: 27, timeOffset: -201 },
        { x: 488, y: 422, id: 27, timeOffset: -151 },
        { x: 440, y: 421, id: 27, timeOffset: -101 },
        { x: 373, y: 419, id: 27, timeOffset: -51 },
        { x: 296, y: 415, id: 27, timeOffset: -1 },
      ],
    },
    timestamp: 1900015365,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 225, y: 409, id: 27, timeOffset: -439 },
        { x: 183, y: 408, id: 27, timeOffset: -389 },
        { x: 138, y: 407, id: 27, timeOffset: -340 },
        { x: 98, y: 406, id: 27, timeOffset: -290 },
        { x: 79, y: 406, id: 27, timeOffset: -238 },
        { x: 60, y: 406, id: 27, timeOffset: -173 },
        { x: 53, y: 406, id: 27, timeOffset: -122 },
        { x: 39, y: 405, id: 27, timeOffset: -55 },
      ],
    },
    timestamp: 1900015870,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 34, y: 403, id: 27, timeOffset: -493 },
        { x: 31, y: 401, id: 27, timeOffset: -442 },
        { x: 29, y: 399, id: 27, timeOffset: -375 },
        { x: 28, y: 399, id: 27, timeOffset: -325 },
        { x: 28, y: 397, id: 27, timeOffset: -259 },
        { x: 28, y: 394, id: 27, timeOffset: -209 },
        { x: 28, y: 394, id: 27, timeOffset: -159 },
        { x: 28, y: 393, id: 27, timeOffset: -109 },
      ],
    },
    timestamp: 1900016373,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 29, y: 393, id: 27, timeOffset: 0 }] },
    timestamp: 1900018598,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 30, y: 391, id: 27, timeOffset: -433 },
        { x: 31, y: 392, id: 27, timeOffset: -251 },
        { x: 30, y: 393, id: 27, timeOffset: -201 },
        { x: 30, y: 394, id: 27, timeOffset: -151 },
      ],
    },
    timestamp: 1900019098,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 30, y: 394, id: 27, timeOffset: -457 },
        { x: 30, y: 394, id: 27, timeOffset: -391 },
      ],
    },
    timestamp: 1900019605,
  },
  { type: 3, data: { source: 2, type: 5, id: 27 }, timestamp: 1900020571 },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 32, y: 394, id: 27, timeOffset: 0 }] },
    timestamp: 1900021531,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 48, y: 394, id: 27, timeOffset: -449 },
        { x: 286, y: 413, id: 27, timeOffset: -384 },
        { x: 418, y: 419, id: 27, timeOffset: -334 },
        { x: 474, y: 419, id: 27, timeOffset: -284 },
        { x: 482, y: 418, id: 27, timeOffset: -233 },
        { x: 482, y: 417, id: 27, timeOffset: -167 },
        { x: 477, y: 416, id: 27, timeOffset: -116 },
        { x: 439, y: 414, id: 27, timeOffset: -51 },
        { x: 402, y: 412, id: 27, timeOffset: 0 },
      ],
    },
    timestamp: 1900022031,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 376, y: 413, id: 27, timeOffset: -450 },
        { x: 366, y: 414, id: 27, timeOffset: -400 },
        { x: 353, y: 416, id: 27, timeOffset: -334 },
        { x: 346, y: 417, id: 27, timeOffset: -283 },
        { x: 339, y: 419, id: 27, timeOffset: -233 },
        { x: 322, y: 422, id: 27, timeOffset: -167 },
        { x: 311, y: 422, id: 27, timeOffset: -117 },
        { x: 308, y: 422, id: 27, timeOffset: -51 },
        { x: 311, y: 420, id: 27, timeOffset: 0 },
      ],
    },
    timestamp: 1900022531,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 315, y: 419, id: 27, timeOffset: -448 },
        { x: 316, y: 418, id: 27, timeOffset: -397 },
        { x: 317, y: 417, id: 27, timeOffset: -347 },
        { x: 317, y: 417, id: 27, timeOffset: -281 },
      ],
    },
    timestamp: 1900023045,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 318, y: 418, id: 27, timeOffset: -466 },
        { x: 326, y: 439, id: 27, timeOffset: -416 },
        { x: 333, y: 473, id: 3, timeOffset: -365 },
        { x: 334, y: 484, id: 3, timeOffset: -300 },
        { x: 334, y: 485, id: 3, timeOffset: -50 },
      ],
    },
    timestamp: 1900023547,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 333, y: 485, id: 3, timeOffset: -483 },
        { x: 321, y: 481, id: 3, timeOffset: -433 },
        { x: 265, y: 460, id: 3, timeOffset: -383 },
        { x: 203, y: 433, id: 27, timeOffset: -332 },
        { x: 135, y: 402, id: 27, timeOffset: -283 },
        { x: 86, y: 387, id: 27, timeOffset: -216 },
        { x: 70, y: 384, id: 27, timeOffset: -166 },
        { x: 58, y: 381, id: 27, timeOffset: -100 },
        { x: 53, y: 381, id: 27, timeOffset: -33 },
      ],
    },
    timestamp: 1900024047,
  },

  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 49, y: 383, id: 27, timeOffset: -468 },
        { x: 39, y: 387, id: 27, timeOffset: -418 },
        { x: 31, y: 389, id: 27, timeOffset: -367 },
        { x: 28, y: 390, id: 27, timeOffset: -301 },
      ],
    },
    timestamp: 1900024548,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 28, y: 390, id: 27, timeOffset: 0 }] },
    timestamp: 1900034631,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 29, y: 393, id: 27, timeOffset: -459 },
        { x: 262, y: 474, id: 3, timeOffset: -376 },
        { x: 562, y: 573, id: 3, timeOffset: -326 },
        { x: 702, y: 603, id: 3, timeOffset: -260 },
        { x: 714, y: 603, id: 3, timeOffset: -209 },
        { x: 716, y: 600, id: 3, timeOffset: -159 },
        { x: 717, y: 597, id: 3, timeOffset: -109 },
      ],
    },
    timestamp: 1900035140,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 718, y: 596, id: 3, timeOffset: 0 }] },
    timestamp: 1900035963,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [{ x: 719, y: 594, id: 3, timeOffset: -451 }],
    },
    timestamp: 1900036464,
  },
  {
    type: 3,
    data: { source: 1, positions: [{ x: 722, y: 594, id: 3, timeOffset: 0 }] },
    timestamp: 1900037931,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 772, y: 588, id: 3, timeOffset: -438 },
        { x: 850, y: 577, id: 3, timeOffset: -371 },
        { x: 879, y: 576, id: 3, timeOffset: -321 },
        { x: 914, y: 576, id: 3, timeOffset: -255 },
        { x: 926, y: 577, id: 3, timeOffset: -205 },
        { x: 932, y: 579, id: 3, timeOffset: -154 },
        { x: 935, y: 582, id: 3, timeOffset: -88 },
        { x: 945, y: 587, id: 3, timeOffset: -22 },
      ],
    },
    timestamp: 1900038435,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 966, y: 593, id: 3, timeOffset: -483 },
        { x: 1006, y: 601, id: 3, timeOffset: -433 },
        { x: 1075, y: 608, id: 3, timeOffset: -383 },
        { x: 1098, y: 610, id: 3, timeOffset: -333 },
        { x: 1102, y: 611, id: 3, timeOffset: -283 },
        { x: 1102, y: 611, id: 3, timeOffset: -217 },
        { x: 1103, y: 612, id: 3, timeOffset: -166 },
        { x: 1103, y: 616, id: 3, timeOffset: -100 },
      ],
    },
    timestamp: 1900038947,
  },
  {
    type: 3,
    data: {
      source: 1,
      positions: [
        { x: 1103, y: 616, id: 3, timeOffset: -151 },
        { x: 1103, y: 616, id: 3, timeOffset: -52 },
        { x: 1103, y: 614, id: 3, timeOffset: 0 },
      ],
    },
    timestamp: 1900039448,
  },
];

export default events;
