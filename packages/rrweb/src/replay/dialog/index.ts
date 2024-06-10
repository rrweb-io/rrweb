import { RRNode } from 'rrdom';

export function triggerShowModalForModals(
  node: HTMLDialogElement | Node | RRNode,
) {
  if (node.nodeName !== 'DIALOG' || node instanceof RRNode) return;
  const dialog = node as HTMLDialogElement;
  console.log('dialog', dialog.getAttribute('rr_open'));
  if (dialog.getAttribute('rr_open') !== 'modal') return;
  dialog.showModal();
}
