// Provides interface for agent to interact with environment
env = {
    score: 0,
    reset: function () {
        // Stop .p5 game loop
        noLoop();
        resetGame(false);
        render ? draw() : tickWithoutRender();
        return _getState();
    },
    step: function (actions) {
        _applyActions(actions);
        // TODO determine ticks per action
        for (let i = 0; i < 60; i++){
            render ? draw() : tickWithoutRender();
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
    // Calculate reward as a difference in score

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

    // array of 700 enemies with their absolute position and type
    let alive_enemies_type_and_pos = buildArray(1, 700, [0, 0, 0])[0];

    enemies.forEach((e, i) => {
        let grid_position = gridPos(e.pos.x, e.pos.y);
        alive_enemies_type_and_pos[i] = [grid_position.x, grid_position.y, e.id];
    });

    return [grid, spawn_and_temp_tiles, wave, health, cash, exit_location, tower_grid, alive_enemies_type_and_pos];
}

