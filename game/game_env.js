// Provides interface for agent to interact with environment
let actionsPerWave = 5;
width = 480;
height = 480;

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
        resetGame(false);

        while (wave < 1) {
            if (render) {
                draw();
            } else {
                tickWithoutRender();
            }
        }
        env.health_lost = 0;
        env.steps = 0;
        env.total_cash_acquired = cash;
        env.score = getScore();

        return getObservation();
    },
    step: function (actions) {
        applyActions(actions);

        env.steps++;

        let action_phase = this.steps % actionsPerWave !== 0;

        const prev_cash = cash;
        const prev_wave = wave;
        const prev_health = health;
        let died = false;
        while (prev_wave === wave && !action_phase) {
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
        env.health_lost = prev_health - health;
        let state = getState(died);

        if (died) {
            env.reset();
        }

        return state;
    }
};

// Return Observation, Reward, Done tuple
function getState(isDone) {
    return [getObservation(), getReward(isDone), isDone || wave >= 40];
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
    if (isDone) {
        if (wave === 40) {
            return;
        }
        return 0;
    }
    // Wave - sparse reward
    // Cash -> health -> wave
    let new_score = getScore();
    let reward = new_score - env.score;
    env.score = new_score;

    // Penalty for losing health after wave passed;
    if (env.health_lost !== 0) {
        reward = reward * (env.health_lost / 40.0);
    }

    // Time scale earlier rewards are more valuable
    reward = reward * (Math.pow(0.6, wave / 10.0));
    return reward;
}

function getScore() {
    return 2 * wave;
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

    let exit_loc = [exit.x, exit.y];
    let s0 = spawnpoints[0];
    let s1 = spawnpoints[1];

    let spawns = [s0.x, s0.y, s1.x, s1.y];
    return [map, wave, health, cash, exit_loc, spawns];
}

