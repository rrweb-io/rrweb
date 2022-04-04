import {
  idNodeMap,
  MaskInputFn,
  MaskInputOptions,
  nodeIdMap,
  nodeMetaMap,
  serializedNode,
} from './types';

export function isElement(n: Node): n is Element {
  return n.nodeType === n.ELEMENT_NODE;
}

export function isShadowRoot(n: Node): n is ShadowRoot {
  const host: Element | null = (n as ShadowRoot)?.host;
  return Boolean(host && host.shadowRoot && host.shadowRoot === n);
}

export class Mirror {
  private idNodeMap: idNodeMap = new Map();
  private nodeIdMap: nodeIdMap = new WeakMap();
  private nodeMetaMap: nodeMetaMap = new WeakMap();

  getId(n: Node | undefined | null): number {
    if (!n) return -1;

    const id = this.nodeIdMap.get(n);

    // if n is not a serialized Node, use -1 as its id.
    return id ?? -1;
  }

  getNode(id: number): Node | null {
    return this.idNodeMap.get(id) || null;
  }

  getIds(): IterableIterator<number> {
    return this.idNodeMap.keys();
  }

  getMeta(n: Node): serializedNode | null {
    return this.nodeMetaMap.get(n) || null;
  }

  // removes the node from idNodeMap
  // doesn't remove the node from nodeMetaMap
  removeNodeFromMap(n: Node) {
    const id = this.getId(n);
    this.idNodeMap.delete(id);

    if (n.childNodes) {
      n.childNodes.forEach((childNode) => this.removeNodeFromMap(childNode));
    }
  }
  has(id: number): boolean {
    return this.idNodeMap.has(id);
  }
  hasNode(node: Node): boolean {
    return this.nodeIdMap.has(node);
  }
  add(n: Node, id: number, meta?: serializedNode) {
    this.idNodeMap.set(id, n);
    this.nodeIdMap.set(n, id);
    if (meta) this.nodeMetaMap.set(n, meta);
  }
  reset() {
    this.idNodeMap = new Map();
    this.nodeIdMap = new WeakMap();
    this.nodeMetaMap = new WeakMap();
  }
}

export function createMirror(): Mirror {
  return new Mirror();
}

export function maskInputValue({
  maskInputOptions,
  tagName,
  type,
  value,
  maskInputFn,
}: {
  maskInputOptions: MaskInputOptions;
  tagName: string;
  type: string | number | boolean | null;
  value: string | null;
  maskInputFn?: MaskInputFn;
}): string {
  let text = value || '';
  if (
    maskInputOptions[tagName.toLowerCase() as keyof MaskInputOptions] ||
    maskInputOptions[type as keyof MaskInputOptions]
  ) {
    if (maskInputFn) {
      text = maskInputFn(text);
    } else {
      text = '*'.repeat(text.length);
    }
  }
  return text;
}

const ORIGINAL_ATTRIBUTE_NAME = '__rrweb_original__';
type PatchedGetImageData = {
  [ORIGINAL_ATTRIBUTE_NAME]: CanvasImageData['getImageData'];
} & CanvasImageData['getImageData'];

export function is2DCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;

  const chunkSize = 50;

  // get chunks of the canvas and check if it is blank
  for (let x = 0; x < canvas.width; x += chunkSize) {
    for (let y = 0; y < canvas.height; y += chunkSize) {
      const getImageData = ctx.getImageData as PatchedGetImageData;
      const originalGetImageData =
        ORIGINAL_ATTRIBUTE_NAME in getImageData
          ? getImageData[ORIGINAL_ATTRIBUTE_NAME]
          : getImageData;
      // by getting the canvas in chunks we avoid an expensive
      // `getImageData` call that retrieves everything
      // even if we can already tell from the first chunk(s) that
      // the canvas isn't blank
      const pixelBuffer = new Uint32Array(
        originalGetImageData.call(
          ctx,
          x,
          y,
          Math.min(chunkSize, canvas.width - x),
          Math.min(chunkSize, canvas.height - y),
        ).data.buffer,
      );
      if (pixelBuffer.some((pixel) => pixel !== 0)) return false;
    }
  }
  return true;
}
