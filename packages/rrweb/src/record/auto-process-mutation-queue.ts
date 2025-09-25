import type { mutationRecord } from '@rrweb/types';

type ProcessFunction = (mutation: mutationRecord) => void;
type ProcessItem = mutationRecord | (() => void);

export class AutoProcessMutationQueue {
  private store: ProcessItem[] = [];
  private processBatch: number;
  private processFunction: ProcessFunction;
  private interval?: number;

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

  enqueue(mutations: ProcessItem[]): void {
    this.store.push(...mutations);
    this.process();
  }

  dequeue(n?: number = this.processBatch): ProcessItem[] {
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
  }

  start(t = 100): void {
    this.interval = setInterval(() => {
      this.process();
    }, t);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
