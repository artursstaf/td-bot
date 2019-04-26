// Provides interface for agent to interact with environment
env = {
    reset: function () {
        // Stop .p5 game loop
        noLoop();
        resetGame(false);
        if (render) {
            draw();
        } else {
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
        for (let i = 0; i < 120; i++) {
            if (render) {
                died = draw();
            } else {
                died = tickWithoutRender();
            }
            if (died) break;
        }

        // Ignore cash loss from buying towers
        let cashGained = Math.max(cash - prev_cash, 0);
        env.total_cash_acquired += cashGained;
        return getState(died);
    }
};

// Return Observation, Reward, Done tuple
function getState(isDone) {
    return [getObservation(), getReward(isDone), isDone];
}

function randomAction() {
    // [[buy, upgrade, sell, nothing],[tower type],
    // [ one hot X coordinate], [one hot Y coordinate]]
    return [randomOneHotOfDepth(4), randomOneHotOfDepth(7),
        randomOneHotOfDepth(cols), randomOneHotOfDepth(rows)]
}

function applyActions(actions) {
    let action = argMax(actions[0]);
    let towerType = argMax(actions[1]) + 1;
    let x = argMax(actions[2]);
    let y = argMax(actions[3]);

    switch (action) {
        case 0: // Buy
            toPlace = true;
            if(canPlace(x, y)){
                buy(createTower(x, y, tower[tower.idToName[towerType]]))
            }
            break;
        case 1: // Upgrade
            var t = getTower(x, y);
            if(t && t.upgrades.length > 0){
                selected = t;
                upgrade(t.upgrades[0]);
            }
            break;
        case 2: // Sell
            var t = getTower(x, y);
            if(t){
                sell(t);
            }
        default:
            break;
    }
}

function getReward(isDone) {
    if (isDone)
        return -10.0;
    // Wave - sparse reward
    // Cash -> health -> wave
    let new_score = getScore();
    let diff = new_score - env.score;
    env.score = new_score;
    return diff;
}

function getScore() {
    return Math.max(wave, 1) + 0.3 * health + 0.055 * env.total_cash_acquired;
}

function getObservation() {
    // TODO What values does grid take??
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

