// Provides interface for agent to interact with environment
let ticksPerActions = 60;
let recordedEnemiesCount = 100;
width = 528;
height = 528;

function envReset() {
    return env.reset();
}

function envStep(actions) {
    return env.step(actions);
}

env = {
    reset: function () {
        // Stop .p5 game loop
        window.noLoop();
        ticks = 0;
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
        for (let i = 0; i < ticksPerActions; i++) {
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
        let state = getState(died);

        if(died){
            env.reset();
        }

        return state;
    }
};

// Return Observation, Reward, Done tuple
function getState(isDone) {
    return [getObservation(), getReward(isDone), isDone || wave >= 37];
}

function randomAction() {
    // [[buy, upgrade, sell, nothing],[tower type],
    // [ one hot X coordinate], [one hot Y coordinate]]
    return [randomInt(4), randomInt(7),
        randomInt(cols), randomInt(rows)]
}

function applyActions(actions) {
    let action = actions[0];
    let towerType = actions[1] + 1;
    let x = actions[2];
    let y = actions[3];

    switch (action) {
        case 0:
            break;
        case 1: // Buy
            toPlace = true;
            if (canPlace(x, y)) {
                buy(createTower(x, y, tower[tower.idToName[towerType]]))
            }
            break;
        case 2: // Upgrade
            var t = getTower(x, y);
            if (t && t.upgrades.length > 0) {
                selected = t;
                upgrade(t.upgrades[0]);
            }
            break;
        case 3: // Sell
            var t = getTower(x, y);
            if (t) {
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
    return 2 * Math.max(wave, 1) + 0.3 * health + 0.15 * env.total_cash_acquired + (towers.length > 0 ? 1 : 0);
}

function getObservation() {
    let map = new Array(grid.length);

    for (let i = 0; i < grid.length; i++)
        map[i] = grid[i].slice(0);

    for (let i = 0; i < spawnpoints.length; i++) {
        let s = spawnpoints[i];
        map[s.x][s.y] = 16;
    }

    for (let i = 0; i < tempSpawns.length; i++) {
        let s = tempSpawns[i][0];
        map[s.x][s.y] = 17;
    }

    // Exit location
    map[exit.x][exit.y] = 18;

    for (let i = 0; i < towers.length; i++) {
        let t = towers[i];
        map[t.gridPos.x][t.gridPos.y] = t.id + 1;
    }

    let alive_enemies_type_and_pos = buildArray(1, recordedEnemiesCount, [0, 0, 0])[0];

    for (let i = 0; i < Math.min(enemies.length, alive_enemies_type_and_pos.length); i++) {
        let e = enemies[i];
        let grid_position = gridPos(e.pos.x, e.pos.y);
        alive_enemies_type_and_pos[i] = [grid_position.x, grid_position.y, e.id];
    }

    return [map, wave, health, cash, alive_enemies_type_and_pos];
}

