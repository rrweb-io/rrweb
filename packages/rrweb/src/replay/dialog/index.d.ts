import type { attributeMutation } from '@newrelic/rrweb-types';
import { RRNode } from '@newrelic/rrdom';
export declare function applyDialogToTopLevel(node: HTMLDialogElement | Node | RRNode, attributeMutation?: attributeMutation): void;
export declare function removeDialogFromTopLevel(node: HTMLDialogElement | Node | RRNode, attributeMutation: attributeMutation): void;
