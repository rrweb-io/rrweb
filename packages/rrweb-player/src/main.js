import _Player from './Player.svelte';
class Player extends _Player {
    constructor(options) {
        super({
            target: options.target,
            props: options.data || options.props,
        });
    }
}
export default Player;
//# sourceMappingURL=main.js.map