/* tslint:disable: no-console */
import { deflate, inflate } from 'pako';
import { eventWithTime } from '../types';
import { Packer, PackedData } from './base';

export class PakoPacker implements Packer {
  public version = 1;

  public pack(events: eventWithTime[]): string {
    const packedString = deflate(JSON.stringify(events), { to: 'string' });
    const data: PackedData<string> = {
      meta: {
        packer: 'pako',
        version: this.version,
      },
      data: packedString,
    };
    return JSON.stringify(data);
  }

  public unpack(raw: string): eventWithTime[] {
    const data: PackedData<string> = JSON.parse(raw);
    if (!data.meta && Array.isArray(data)) {
      // unpacking unpacked data, maybe legacy events
      console.info('unpacking unpacked data...');
      return data;
    }
    if (!data.meta) {
      throw new Error('Unknown data format.');
    }
    if (data.meta.packer !== 'pako') {
      console.info(data.meta);
      throw new Error('These events were not packed by the pako packer.');
    }
    if (data.meta.version !== this.version) {
      throw new Error(
        `These events were packed with version ${data.meta.version} which is incompatible with current version ${this.version}.`,
      );
    }
    return JSON.parse(inflate(data.data, { to: 'string' }));
  }
}
