// Provides interface for agent to interact with environment
env = {
    reset: function () {
        // Stop .p5 game loop
        noLoop();
        resetGame();
        return _getState();
    },
    step: function (actions) {
        _applyActions(actions);
        if (render) {
            draw();
        } else {
            tickWithoutRender();
        }
        return _getState();
    }
};

// Return Observation, Reward, Done tuple
function _getState(){
    return [_getObservation(), _getReward(), _getDone()];
}

function _applyActions(actions) {

}

function _getReward(){
    // TODO
}

function _getDone(){
    return health <= 1;
}

function _getObservation() {
    let spawn_and_temp_tiles = create2DZerosLike([cols, rows]);

    spawnpoints.forEach((s) => {
        spawn_and_temp_tiles[s.x][s.y] = 1;
    });
    tempSpawns.forEach((s) => {
        spawn_and_temp_tiles[s.x][s.y] = 1;
    });

    let exit_location = [exit.x, exit.y];

    // 0 no tower, 1 - 14 tower types
    let tower_grid = create2DZerosLike([cols, rows]);
    towers.forEach((t) => {
       tower_grid[t.gridPos.x][t.gridPos.y] = t.id;
    });

    let alive_enemies_type_and_pos = [];

    enemies.forEach((e) => {
        // TODO find gridpos and encode with max length array
    });

    return [grid, spawn_and_temp_tiles, wave, health, cash, exit_location, tower_grid, alive_enemies_type_and_pos];
}