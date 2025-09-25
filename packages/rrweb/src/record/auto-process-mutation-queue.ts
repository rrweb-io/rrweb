import type { mutationRecord } from '@rrweb/types';
import { nowTimestamp } from '../utils';

type ProcessFunction = (mutation: ProcessItem) => void;
type ProcessItem = [mutationRecord, timestamp: number] | (() => void);

export class AutoProcessMutationQueue {
  private store: ProcessItem[] = [];
  private processBatch: number;
  private processFunction: ProcessFunction;
  private interval?: ReturnType<typeof setInterval>;

  constructor({
    processFunction,
    processBatch = 10_000,
  }: {
    processBatch?: number;
    processFunction: ProcessFunction;
  }) {
    this.processBatch = processBatch;
    this.processFunction = processFunction;
  }

  get size() {
    return this.store.length;
  }

  enqueue(mutations: (mutationRecord | (() => void))[]): void {
    mutations.forEach((m) =>
      this.store.push(typeof m === 'function' ? m : [m, nowTimestamp()]),
    );
    this.start();
    this.process();
  }

  dequeue(n: number = this.processBatch): ProcessItem[] {
    if (this.store.length) {
      return this.store.splice(0, n);
    }
    return [];
  }

  process(): void {
    const records = this.dequeue();
    records.forEach((record: ProcessItem) =>
      typeof record === 'function' ? record() : this.processFunction(record),
    );
    if (!this.store.length) {
      this.stop();
    }
  }

  getFirstMutation() {
    return this.store.find((i) => typeof i !== 'function');
  }

  start(t = 100): void {
    this.interval = setInterval(() => {
      this.process();
    }, t);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}
