import { eventWithTime } from '../types';

export abstract class Packer {
  public version!: number;

  public pack!: (events: eventWithTime[]) => string;
  public unpack!: (raw: string) => eventWithTime[];
}

export type PackedData<T> = {
  meta: Meta;
  data: T;
};

export type Meta = {
  packer: string;
  version: number;
};
