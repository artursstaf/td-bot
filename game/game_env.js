// Provides interface for agent to interact with environment
env = {
    reset: function () {
        // Stop .p5 game loop
        noLoop();
        resetGame(false);
        if(render){
            draw();
        }else{
            tickWithoutRender();
        }

        this.total_cash_acquired = cash;
        this.score = getScore();

        return getObservation();
    },
    step: function (actions) {
        applyActions(actions);

        let prev_cash = cash;

        // TODO determine ticks per action
        let died = false;
        for (let i = 0; i < 120; i++){
            if(render){
                died = draw();
            }else{
                died = tickWithoutRender();
            }
            if(died) break;
        }

        // Ignore cash loss from buying towers
        let cashGained = Math.max(cash - prev_cash, 0);
        env.total_cash_acquired += cashGained;
        return getState(died);
    }
};

// Return Observation, Reward, Done tuple
function getState(isDone){
    return [getObservation(), getReward(isDone), isDone];
}

function applyActions(actions) {

}

function getReward(isDone){
    if(isDone)
        return -10.0;
    // Wave - sparse reward
    // Cash -> health -> wave
    let new_score = getScore();
    let diff = new_score - env.score;
    env.score = new_score;
    return diff;
}

function getScore(){
    return Math.max(wave, 1) + 0.3 * health + 0.055 * env.total_cash_acquired;
}

function getObservation() {
    let map = [...grid];

    spawnpoints.forEach((s) => {
        map[s.x][s.y] = 15;
    });
    tempSpawns.forEach((s) => {
        map[s.x][s.y] = 16;
    });

    // Exit location
    map[exit.x][exit.y] = 17;

    towers.forEach((t) => {
        map[t.gridPos.x][t.gridPos.y] = t.id;
    });

    // array of 700 enemies with their absolute position and type
    let alive_enemies_type_and_pos = buildArray(1, 1500, [0, 0, 0])[0];

    enemies.forEach((e, i) => {
        let grid_position = gridPos(e.pos.x, e.pos.y);
        alive_enemies_type_and_pos[i] = [grid_position.x, grid_position.y, e.id];
    });

    return [map, wave, health, cash, alive_enemies_type_and_pos];
}

