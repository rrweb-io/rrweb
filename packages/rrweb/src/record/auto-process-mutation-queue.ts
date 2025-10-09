import type { mutationRecord } from '@rrweb/types';
import { nowTimestamp } from '../utils';

type ProcessFunction = (mutation: mutationRecord) => void;
type MutationItem = {
  mutationRecord: mutationRecord;
  timestamp: number;
};
type ProcessItem = MutationItem | (() => void);

export class AutoProcessMutationQueue {
  private store: ProcessItem[] = [];
  private batchSize: number;
  private batchInterval: number;
  private processFunction: ProcessFunction;
  private interval?: ReturnType<typeof setInterval>;

  constructor({
    processFunction,
    batchSize = 5_000,
    batchInterval = 100,
  }: {
    batchSize?: number;
    processFunction: ProcessFunction;
    batchInterval?: number;
  }) {
    this.batchSize = batchSize;
    this.processFunction = processFunction;
    this.batchInterval = batchInterval;
  }

  get size() {
    return this.store.length;
  }

  enqueue(mutations: (mutationRecord | (() => void))[]): void {
    mutations.forEach((m) =>
      this.store.push(
        typeof m === 'function'
          ? m
          : { mutationRecord: m, timestamp: nowTimestamp() },
      ),
    );
    this.process();
  }

  dequeue(n: number = this.batchSize): ProcessItem[] {
    if (this.store.length) {
      return this.store.splice(0, n);
    }
    return [];
  }

  process(): void {
    const records = this.dequeue();
    records.forEach((record: ProcessItem) =>
      typeof record === 'function'
        ? record()
        : this.processFunction(record.mutationRecord),
    );
    if (!this.store.length && this.interval) {
      this.stop();
    } else if (!this.interval) {
      this.start();
    }
  }

  getFirstMutation(): MutationItem | undefined {
    return this.store.find((i): i is MutationItem => typeof i !== 'function');
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
