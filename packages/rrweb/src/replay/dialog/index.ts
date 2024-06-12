import type { attributeMutation } from '@rrweb/types';
import { RRNode } from 'rrdom';

export function triggerShowModalForModals(
  node: HTMLDialogElement | Node | RRNode,
  attributeMutation?: attributeMutation,
) {
  if (node.nodeName !== 'DIALOG' || node instanceof RRNode) return;
  const dialog = node as HTMLDialogElement;
  const isOpen = dialog.open;
  const isModal = isOpen && dialog.matches('dialog:modal');

  const shouldBeOpen =
    typeof attributeMutation?.attributes.open === 'string' ||
    typeof dialog.getAttribute('open') === 'string';
  const shouldBeModal = dialog.getAttribute('rr_open') === 'modal';
  const shouldBeNonModal = dialog.getAttribute('rr_open') === 'non-modal';
  const modeChanged =
    (isModal && shouldBeNonModal) || (!isModal && shouldBeModal);

  if (isOpen && !modeChanged) return;
  // complain if dialog is not attached to the dom
  if (!dialog.isConnected) {
    console.warn('dialog is not attached to the dom', dialog);
    return;
  }

  if (isOpen) dialog.close();

  if (!shouldBeOpen) return;

  if (shouldBeModal) dialog.showModal();
  else dialog.show();
}

export function triggerCloseForModals(
  node: HTMLDialogElement | Node | RRNode,
  attributeMutation: attributeMutation,
) {
  if (node.nodeName !== 'DIALOG' || node instanceof RRNode) return;
  const dialog = node as HTMLDialogElement;

  // complain if dialog is not attached to the dom
  if (!dialog.isConnected) {
    console.warn('dialog is not attached to the dom', dialog);
    return;
  }

  if (attributeMutation.attributes.open === null) {
    dialog.removeAttribute('open');
    dialog.removeAttribute('rr_open');
  }
}
