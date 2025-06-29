class StormSnapshotManager {
  static instance: StormSnapshotManager;

  private fullSnapshotTaker: (() => void) | null = null;
  private lastFullSnapshot: number = -1;

  private intervalBetweenSnapshots = 150;

  constructor() {
    if (StormSnapshotManager.instance) {
      return StormSnapshotManager.instance;
    }

    StormSnapshotManager.instance = this;
  }

  public bindFullSnapshotTaker(takeFullSnapshot: () => void) {
    this.fullSnapshotTaker = takeFullSnapshot;
  }

  public requestFullSnapshot(bufferId: string) {
    if (!this.fullSnapshotTaker) {
      console.log(
        'requestFullSnapshot: no full snapshot taker',
        'bufferId:',
        bufferId,
      );
      return;
    }

    if (Date.now() - this.lastFullSnapshot < this.intervalBetweenSnapshots) {
      console.log('requestFullSnapshot: too soon', 'bufferId:', bufferId);
      return;
    }

    console.log('taking full snapshot', 'bufferId:', bufferId);

    this.fullSnapshotTaker();
    this.lastFullSnapshot = Date.now();
  }
}

const stormSnapshotManager = new StormSnapshotManager();

export default stormSnapshotManager;
