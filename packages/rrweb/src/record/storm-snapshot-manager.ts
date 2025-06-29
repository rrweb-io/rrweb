import { takeFullSnapshot } from '..';

class StormSnapshotManager {
  static instance: StormSnapshotManager;

  private lastFullSnapshot: number = -1;

  private intervalBetweenSnapshots = 150;

  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private debounceTime = 10;

  constructor() {
    if (StormSnapshotManager.instance) {
      return StormSnapshotManager.instance;
    }

    StormSnapshotManager.instance = this;
  }

  //we're debouncing here because of how mutation buffers work.
  //multiple observers create their own mutation buffer, and
  //each buffer will handle mutations storms, so multiple buffers
  //will probably request a full snapshot at (basically) the same time.
  //we want to ensure all buffers have requested a full snapshot
  //(so we can be sure that all mutations have been made)
  //before we actually take a full snapshot.

  //also, we want a low debounceTime, bc if theres multiple, distinctive mutation storms,
  //in a somewhat quick succession, we want to record activity between them
  //not just one full snapshot after all the storms
  public requestFullSnapshot() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.debounceTimeout = null;
      this.takeSnapshot();
    }, this.debounceTime);
  }

  private takeSnapshot() {
    if (Date.now() - this.lastFullSnapshot < this.intervalBetweenSnapshots) {
      console.log('StormSnapshotManager, takeSnapshot: too soon');
      return;
    }

    console.log('StormSnapshotManager, takeSnapshot: taking full snapshot');

    takeFullSnapshot();
    this.lastFullSnapshot = Date.now();
  }
}

const stormSnapshotManager = new StormSnapshotManager();

export default stormSnapshotManager;
