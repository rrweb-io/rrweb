import { earlyPatch } from '../record/observers/canvas/canvas-manager';

function rrwebInit() {
  earlyPatch();
  // anticipate other window patching to go here
}
export default rrwebInit;
