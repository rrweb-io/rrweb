import { NodeType } from '@rrweb/types';
import type {
  documentNode,
  documentTypeNode,
  elementNode,
  serializedNode,
  textNode,
} from '@rrweb/types';

export { isElement, Mirror, extractFileExtension } from './shared-utils';

export function isNodeMetaEqual(a: serializedNode, b: serializedNode): boolean {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === NodeType.Document)
    return a.compatMode === (b as documentNode).compatMode;
  else if (a.type === NodeType.DocumentType)
    return (
      a.name === (b as documentTypeNode).name &&
      a.publicId === (b as documentTypeNode).publicId &&
      a.systemId === (b as documentTypeNode).systemId
    );
  else if (
    a.type === NodeType.Comment ||
    a.type === NodeType.Text ||
    a.type === NodeType.CDATA
  )
    return a.textContent === (b as textNode).textContent;
  else if (a.type === NodeType.Element)
    return (
      a.tagName === (b as elementNode).tagName &&
      JSON.stringify(a.attributes) ===
        JSON.stringify((b as elementNode).attributes) &&
      a.isSVG === (b as elementNode).isSVG &&
      a.needBlock === (b as elementNode).needBlock
    );
  return false;
}
