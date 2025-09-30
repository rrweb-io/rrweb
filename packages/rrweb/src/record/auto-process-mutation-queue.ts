import type { mutationRecord } from '@rrweb/types';
import { nowTimestamp } from '../utils';

type ProcessFunction = (mutation: ProcessItem) => void;
type ProcessItem = [mutationRecord, timestamp: number] | (() => void);

export class AutoProcessMutationQueue {
  private store: ProcessItem[] = [];
  private processBatch: number;
  private batchInterval: number;
  private processFunction: ProcessFunction;
  private interval?: ReturnType<typeof setInterval>;

  constructor({
    processFunction,
    processBatch = 5_000,
    batchInterval = 100,
  }: {
    processBatch?: number;
    processFunction: ProcessFunction;
    batchInterval?: number;
  }) {
    this.processBatch = processBatch;
    this.processFunction = processFunction;
    this.batchInterval = batchInterval;
  }

  get size() {
    return this.store.length;
  }

  enqueue(mutations: (mutationRecord | (() => void))[]): void {
    mutations.forEach((m) =>
      this.store.push(typeof m === 'function' ? m : [m, nowTimestamp()]),
    );
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
    if (!this.store.length && this.interval) {
      this.stop();
    } else if (!this.interval) {
      this.start();
    }
  }

  getFirstMutation() {
    return this.store.find((i) => typeof i !== 'function');
  }

  shouldPoll() {
    return this.store.length && !this.interval;
  }

  start(): void {
    this.interval = setInterval(() => {
      this.process();
    }, this.batchInterval);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}
