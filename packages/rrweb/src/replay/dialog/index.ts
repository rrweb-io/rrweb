import type { attributeMutation } from '@rrweb/types';
import { RRNode } from 'rrdom';

export function triggerShowModalForModals(
  node: HTMLDialogElement | Node | RRNode,
) {
  if (node.nodeName !== 'DIALOG' || node instanceof RRNode) return;
  const dialog = node as HTMLDialogElement;
  if (dialog.getAttribute('rr_open') !== 'modal') return;

  // complain if dialog is not attached to the dom
  if (!dialog.isConnected) {
    console.warn('dialog is not attached to the dom', dialog);
    return;
  }

  dialog.showModal();
}

export function triggerCloseForModals(
  node: HTMLDialogElement | Node | RRNode,
  attributeMuation: attributeMutation,
) {
  if (node.nodeName !== 'DIALOG' || node instanceof RRNode) return;
  const dialog = node as HTMLDialogElement;

  // complain if dialog is not attached to the dom
  if (!dialog.isConnected) {
    console.warn('dialog is not attached to the dom', dialog);
    return;
  }

  if (attributeMuation.attributes.rr_open === null) {
    dialog.close();
  }
  if (attributeMuation.attributes.open === '') {
    dialog.show();
  }
}
