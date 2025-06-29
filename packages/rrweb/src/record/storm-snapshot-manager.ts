import { takeFullSnapshot } from '..';
function makeid(length = 8) {
  var result = '';
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

class StormSnapshotManager {
  static instance: StormSnapshotManager;

  private id: string = makeid();

  private lastFullSnapshot: number = -1;

  private intervalBetweenSnapshots = 150;

  constructor() {
    if (StormSnapshotManager.instance) {
      return StormSnapshotManager.instance;
    }

    StormSnapshotManager.instance = this;
  }

  public requestFullSnapshot(bufferId: string) {
    if (!takeFullSnapshot) return;

    if (Date.now() - this.lastFullSnapshot < this.intervalBetweenSnapshots) {
      console.log(
        'requestFullSnapshot: too soon',
        'storm snapshot mng id:',
        this.id,
        'bufferId:',
        bufferId,
      );
      return;
    }

    console.log(
      'taking full snapshot',
      'storm snapshot mng id:',
      this.id,
      'bufferId:',
      bufferId,
    );

    takeFullSnapshot();
    this.lastFullSnapshot = Date.now();
  }
}

const stormSnapshotManager = new StormSnapshotManager();

export default stormSnapshotManager;
