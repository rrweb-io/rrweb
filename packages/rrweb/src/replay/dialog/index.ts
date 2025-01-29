import type { attributeMutation } from '@saola.ai/rrweb-types';
import { RRNode } from '@saola.ai/rrdom';

/**
 * Checks if the dialog is a top level dialog and applies the dialog to the top level
 * @param node - potential dialog element to apply top level `showModal()` to, or other node (which will be ignored)
 * @param attributeMutation - the attribute mutation used to change the dialog (optional)
 * @returns void
 */
export function applyDialogToTopLevel(
  node: HTMLDialogElement | Node | RRNode,
  attributeMutation?: attributeMutation,
): void {
  if (node.nodeName !== 'DIALOG' || node instanceof RRNode) return;
  const dialog = node as HTMLDialogElement;
  const oldIsOpen = dialog.open;
  const oldIsModalState = oldIsOpen && dialog.matches('dialog:modal');
  const rrOpenMode = dialog.getAttribute('rr_open_mode');

  const newIsOpen =
    typeof attributeMutation?.attributes.open === 'string' ||
    typeof dialog.getAttribute('open') === 'string';
  const newIsModalState = rrOpenMode === 'modal';
  const newIsNonModalState = rrOpenMode === 'non-modal';

  const modalStateChanged =
    (oldIsModalState && newIsNonModalState) ||
    (!oldIsModalState && newIsModalState);

  if (oldIsOpen && !modalStateChanged) return;
  // complain if dialog is not attached to the dom
  if (!dialog.isConnected) {
    console.warn('dialog is not attached to the dom', dialog);
    return;
  }

  if (oldIsOpen) dialog.close();
  if (!newIsOpen) return;

  if (newIsModalState) dialog.showModal();
  else dialog.show();
}

/**
 * Check if the dialog is a top level dialog and removes the dialog from the top level if necessary
 * @param node - potential dialog element to remove from top level, or other node (which will be ignored)
 * @param attributeMutation - the attribute mutation used to change the dialog
 * @returns void
 */
export function removeDialogFromTopLevel(
  node: HTMLDialogElement | Node | RRNode,
  attributeMutation: attributeMutation,
): void {
  if (node.nodeName !== 'DIALOG' || node instanceof RRNode) return;
  const dialog = node as HTMLDialogElement;

  // complain if dialog is not attached to the dom
  if (!dialog.isConnected) {
    console.warn('dialog is not attached to the dom', dialog);
    return;
  }

  if (attributeMutation.attributes.open === null) {
    dialog.removeAttribute('open');
    dialog.removeAttribute('rr_open_mode');
  }
}
