let enemies = [];
let projectiles = [];
let systems = [];
let towers = [];
let newEnemies = [];
let newProjectiles = [];
let newTowers = [];

let cols;
let rows;
const tileZoom = 2;
let ts = 24;            // tile size
const zoomDefault = ts;

const particleAmt = 32;   // number of particles to draw per explosion

const tempSpawnCount = 40;

let custom;             // custom map JSON
let display;            // graphical display tiles
let displayDir;         // direction display tiles are facing
                        // (0 = none, 1 = left, 2 = up, 3 = right, 4 = down)
let dists;              // distance to exit
let grid;               // tile type
                        // (0 = empty, 1 = wall, 2 = path, 3 = tower,
                        //  4 = enemy-only pathing)
let metadata;           // tile metadata
let paths;              // direction to reach exit
let visitMap;           // whether exit can be reached
let walkMap;            // walkability map

let exit;
let spawnpoints = [];
let tempSpawns = [];

let cash;
let health;
let maxHealth;
let wave;
let prev_wave_glob;

let spawnCool;          // number of ticks between spawning enemies

let bg;                 // background color
let border;             // color to draw on tile borders
let borderAlpha;        // alpha of tile borders

let selected;
let towerType;

let sounds;             // dict of all sounds
let boomSound;          // explosion sound effect

// TODO add more functionality to god mode
let godMode = false;    // make player immortal for test purposes
let healthBar = true;   // display enemy health bar
let muteSounds = false; // whether to mute sounds
let paused;             // whether to update or not
const randomWaves = true; // whether to do random or custom waves
let scd;                // number of ticks until next spawn cycle
let showEffects = true; // whether or not to display particle effects
let showFPS = false;    // whether or not to display FPS
let skipToNext = false; // whether or not to immediately start next wave
let stopFiring = false; // whether or not to pause towers firing
let toCooldown;         // flag to reset spawning cool-down
let toPathfind;         // flag to update enemy path-finding
let toPlace;            // flag to place a tower
let toWait;             // flag to wait before next wave
let wcd;                // number of ticks until next wave

let avgFPS = 0;         // current average of all FPS values
let numFPS = 0;         // number of FPS values calculated so far

const minDist = 15;       // minimum distance between spawn-point and exit
const resistance = 0.5;   // percentage of damage blocked by resistance
const sellConst = 0.8;    // ratio of tower cost to sell price
let wallCover = 0.1;    // percentage of map covered by walls
const waveCool = 120;     // number of ticks between waves
const weakness = 0.5;     // damage increase from weakness
let render = true;
let ticks = 0;

// Misc functions

// Spawn a group of enemies, alternating if multiple types
function addGroup(group) {
    const count = group.pop();
    for (let i = 0; i < count; i++) {
        for (let j = 0; j < group.length; j++) {
            newEnemies.push(group[j]);
        }
    }
}

// Prepare a wave
function addWave(pattern) {
    spawnCool = pattern.shift();
    for (let i = 0; i < pattern.length; i++) {
        addGroup(pattern[i]);
    }
}

// Buy and place a tower if player has enough moneyd
function buy(t) {
    if (godMode || cash >= t.cost) {
        if (!godMode) {
            cash -= t.cost;
            toPlace = false;
        }
        selected = t;
        if (grid[t.gridPos.x][t.gridPos.y] === 0) toPathfind = true;
        updateInfo(t);
        newTowers.push(t);
        return true;
    }
    return false;
}

// Calculate and display current and average FPS
function calcFPS() {
    const fps = frameRate();
    avgFPS += (fps - avgFPS) / ++numFPS;

    // Draw black rect under text
    noStroke();
    fill(0);
    rect(0, height - 40, 70, 40);

    // Update FPS meter
    fill(255);
    const fpsText = 'FPS: ' + fps.toFixed(2) + '\nAvg: ' + avgFPS.toFixed(2);
    text(fpsText, 5, height - 25);
}

// Check if all conditions for placing a tower are true
function canPlace(col, row) {
    if (!toPlace) return false;
    const g = grid[col][row];
    if (g === 3) return true;
    if (g === 1 || g === 2 || g === 4) return false;
    if (!empty(col, row) || !placeable(col, row)) return false;
    return true;
}

// Check if spawn cooldown is done and enemies are available to spawn
function canSpawn() {
    return newEnemies.length > 0 && scd === 0;
}

// Clear tower information
function clearInfo() {
    if (!render) return;
    document.getElementById('info-div').style.display = 'none';
}

// TODO implement
function customWave() {
}

// Check if all conditions for showing a range are true
function doRange() {
    return mouseInMap() && toPlace && typeof towerType !== 'undefined';
}

// Check if tile is empty
function empty(col, row) {
    // Check if not walkable
    if (!walkable(col, row)) return false;

    // Check if spawnpoint
    for (let i = 0; i < spawnpoints.length; i++) {
        const s = spawnpoints[i];
        if (s.x === col && s.y === row) return false;
    }

    // Check if exit
    if (typeof exit !== 'undefined') {
        if (exit.x === col && exit.y === row) return false;
    }

    return true;
}

// Return map string
function exportMap() {
    // Convert spawnpoints into a JSON-friendly format
    const spawns = [];
    for (let i = 0; i < spawnpoints.length; i++) {
        const s = spawnpoints[i];
        spawns.push([s.x, s.y]);
    }
    return LZString.compressToBase64(JSON.stringify({
        // Grids
        display: display,
        displayDir: displayDir,
        grid: grid,
        metadata: metadata,
        paths: paths,
        // Important tiles
        exit: [exit.x, exit.y],
        spawnpoints: spawns,
        // Colors
        bg: bg,
        border: border,
        borderAlpha, borderAlpha,
        // Misc
        cols: cols,
        rows: rows
    }));
}

// Get an empty tile
function getEmpty() {
    while (true) {
        const t = randomTile();
        if (empty(t.x, t.y)) return t;
    }
}

// Find tower at specific tile, otherwise return null
function getTower(col, row) {
    for (let i = 0; i < towers.length; i++) {
        const t = towers[i];
        if (t.gridPos.x === col && t.gridPos.y === row) return t;
    }
    return null;
}

// Return map of visitability
function getVisitMap(walkMap) {
    const frontier = [];
    const target = vts(exit);
    frontier.push(target);
    const visited = {};
    visited[target] = true;

    // Fill visited for every tile
    while (frontier.length !== 0) {
        const current = frontier.shift();
        const t = stv(current);
        const adj = neighbors(walkMap, t.x, t.y, true);

        for (let i = 0; i < adj.length; i++) {
            const next = adj[i];
            if (!(next in visited)) {
                frontier.push(next);
                visited[next] = true;
            }
        }
    }

    return visited;
}

// Return walkability map
function getWalkMap() {
    const walkMap = [];
    for (let x = 0; x < cols; x++) {
        walkMap[x] = [];
        for (let y = 0; y < rows; y++) {
            walkMap[x][y] = walkable(x, y);
        }
    }
    return walkMap;
}

// Check if wave is at least min and less than max
function isWave(min, max) {
    if (typeof max === 'undefined') return wave >= min;
    return wave >= min && wave < max;
}

// Load map from template
// Always have an exit and spawnpoints if you do not have a premade grid
function loadMap() {
    const name = 'dense2';

    health = 40;
    cash = 55;

    resizeMax();
    let numSpawns;
    wallCover = 0.1;
    if (name[name.length - 1] === '3') {
        cash = 65;
        numSpawns = 3;
    } else {
        numSpawns = 2;
    }
    if (name === 'empty2' || name === 'empty3') {
        wallCover = 0;
    }
    if (name === 'sparse2' || name === 'sparse3') {
        wallCover = 0.1;
    }
    if (name === 'dense2' || name === 'dense3') {
        wallCover = 0.2;
    }
    if (name === 'solid2' || name === 'solid3') {
        wallCover = 0.3;
    }
    randomMap(numSpawns);
    display = replaceArray(
        grid, [0, 1, 2, 3, 4], ['empty', 'wall', 'empty', 'tower', 'empty']
    );
    displayDir = buildArray(cols, rows, 0);
    // Colors
    bg = [0, 0, 0];
    border = 255;
    borderAlpha = 31;
    // Misc
    metadata = buildArray(cols, rows, null);
    tempSpawns = [];
    recalculate();
}

// Load all sounds
function loadSounds() {
    sounds = {};

    // Missile explosion
    sounds.boom = loadSound('sounds/boom.wav');
    sounds.boom.setVolume(0.3);

    // Missile launch
    sounds.missile = loadSound('sounds/missile.wav');
    sounds.missile.setVolume(0.3);

    // Enemy death
    sounds.pop = loadSound('sounds/pop.wav');
    sounds.pop.setVolume(0.4);

    // Railgun
    sounds.railgun = loadSound('sounds/railgun.wav');
    sounds.railgun.setVolume(0.3);

    // Sniper rifle shot
    sounds.sniper = loadSound('sounds/sniper.wav');
    sounds.sniper.setVolume(0.2);

    // Tesla coil
    sounds.spark = loadSound('sounds/spark.wav');
    sounds.spark.setVolume(0.3);

    // Taunt enemy death
    sounds.taunt = loadSound('sounds/taunt.wav');
    sounds.taunt.setVolume(0.3);
}

// Increment wave counter and prepare wave
function nextWave() {
    addWave(randomWaves ? randomWave() : customWave());
    wave++;
}

// Check if no more enemies
function noMoreEnemies() {
    return enemies.length === 0 && newEnemies.length === 0;
}

function outsideMap(e) {
    return outsideRect(e.pos.x, e.pos.y, 0, 0, width, height);
}

// Toggle pause state
function pause() {
    paused = !paused;
}

// Return false if blocking a tile would invalidate paths to exit
function placeable(col, row) {
    const walkMap = getWalkMap();
    walkMap[col][row] = false;
    const visitMap = getVisitMap(walkMap);

    // Check spawnpoints
    for (var i = 0; i < spawnpoints.length; i++) {
        if (!visitMap[vts(spawnpoints[i])]) return false;
    }

    // Check each enemy
    for (var i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const p = gridPos(e.pos.x, e.pos.y);
        if (p.equals(col, row)) continue;
        if (!visitMap[vts(p)]) return false;
    }

    return true;
}

// Generate random map
function randomMap(numSpawns) {
    // Generate empty tiles and walls
    grid = [];
    for (let x = 0; x < cols; x++) {
        grid[x] = [];
        for (let y = 0; y < rows; y++) {
            grid[x][y] = window.random() < wallCover ? 1 : 0;
        }
    }
    walkMap = getWalkMap();

    // Generate exit and remove walls that are adjacent
    exit = getEmpty();
    const adj = neighbors(walkMap, exit.x, exit.y, false);
    for (var i = 0; i < adj.length; i++) {
        const n = stv(adj[i]);
        grid[n.x][n.y] = 0;
    }

    // Generate enemy spawnpoints and ensure exit is possible
    spawnpoints = [];
    visitMap = getVisitMap(walkMap);
    for (var i = 0; i < numSpawns; i++) {
        let s;
        // Try to place spawnpoint
        for (let j = 0; j < 100; j++) {
            s = getEmpty();

            // Try to find walkable exit 50 times if cant, just generate new map
            for (let z = 0; z < 50; z++) {
                if (visitMap[vts(s)]) break;
                s = getEmpty();
            }

            if (!visitMap[vts(s)]) {
                randomMap(numSpawns);
                return;
            }

            if (s.dist(exit) >= minDist) break;
        }
        spawnpoints.push(s);
    }
}

// Random grid coordinate
function randomTile() {
    return window.createVector(randint(cols), randint(rows));
}

// Generate a random wave
function randomWave() {
    const waves = [];

    if (isWave(0, 1)) {
        waves.push([70, ['weak', 50]]);
    }
    if (isWave(1, 3)) {
        waves.push([60, ['weak', 50]]);
    }
    if (isWave(2, 4)) {
        waves.push([20, ['weak', 25]]);
    }
    if (isWave(2, 7)) {
        waves.push([30, ['weak', 25], ['strong', 25]]);
        waves.push([20, ['strong', 25]]);
    }
    if (isWave(3, 7)) {
        waves.push([40, ['fast', 25]]);
    }
    if (isWave(4, 14)) {
        waves.push([20, ['fast', 50]]);
    }
    if (isWave(5, 6)) {
        waves.push([20, ['strong', 50], ['fast', 25]]);
    }
    if (isWave(8, 12)) {
        waves.push([20, ['medic', 'strong', 'strong', 25]]);
    }
    if (isWave(10, 13)) {
        waves.push([20, ['medic', 'strong', 'strong', 50]]);
        waves.push([30, ['medic', 'strong', 'strong', 50], ['fast', 50]]);
        waves.push([5, ['fast', 50]]);
    }
    if (isWave(12, 16)) {
        waves.push([20, ['medic', 'strong', 'strong', 50], ['strongFast', 50]]);
        waves.push([10, ['strong', 50], ['strongFast', 50]]);
        waves.push([10, ['medic', 'strongFast', 50]]);
        waves.push([10, ['strong', 25], ['stronger', 25], ['strongFast', 50]]);
        waves.push([10, ['strong', 25], ['medic', 25], ['strongFast', 50]]);
        waves.push([20, ['medic', 'stronger', 'stronger', 50]]);
        waves.push([10, ['medic', 'stronger', 'strong', 50]]);
        waves.push([10, ['medic', 'strong', 50], ['medic', 'strongFast', 50]]);
        waves.push([5, ['strongFast', 100]]);
        waves.push([20, ['stronger', 50]]);
    }
    if (isWave(13, 20)) {
        waves.push([40, ['tank', 'stronger', 'stronger', 'stronger', 10]]);
        waves.push([10, ['medic', 'stronger', 'stronger', 50]]);
        waves.push([40, ['tank', 25]]);
        waves.push([20, ['tank', 'stronger', 'stronger', 50]]);
        waves.push([20, ['tank', 'medic', 50], ['strongFast', 25]]);
    }
    if (isWave(14, 20)) {
        waves.push([20, ['tank', 'stronger', 'stronger', 50]]);
        waves.push([20, ['tank', 'medic', 'medic', 50]]);
        waves.push([20, ['tank', 'medic', 50], ['strongFast', 25]]);
        waves.push([10, ['tank', 50], ['strongFast', 25]]);
        waves.push([10, ['faster', 50]]);
        waves.push([20, ['tank', 50], ['faster', 25]]);
    }
    if (isWave(17, 25)) {
        waves.push([20, ['taunt', 'stronger', 'stronger', 'stronger', 25]]);
        waves.push([20, ['spawner', 'stronger', 'stronger', 'stronger', 25]]);
        waves.push([20, ['taunt', 'tank', 'tank', 'tank', 25]]);
        waves.push([40, ['taunt', 'tank', 'tank', 'tank', 25]]);
    }
    if (isWave(19)) {
        waves.push([20, ['spawner', 1], ['tank', 20], ['stronger', 25]]);
        waves.push([20, ['spawner', 1], ['faster', 25]]);
    }
    if (isWave(23)) {
        waves.push([20, ['taunt', 'medic', 'tank', 25]]);
        waves.push([20, ['spawner', 2], ['taunt', 'medic', 'tank', 25]]);
        waves.push([10, ['spawner', 1], ['faster', 100]]);
        waves.push([5, ['faster', 100]]);
        waves.push([
            20, ['tank', 100], ['faster', 50],
            ['taunt', 'tank', 'tank', 'tank', 50]
        ]);
        waves.push([
            10, ['taunt', 'stronger', 'tank', 'stronger', 50],
            ['faster', 50]
        ]);
    }

    if (isWave(25)) {
        waves.push([5, ['taunt', 'medic', 'tank', 50], ['faster', 50]]);
        waves.push([5, ['taunt', 'faster', 'faster', 'faster', 50]]);
        waves.push([
            10, ['taunt', 'tank', 'tank', 'tank', 50],
            ['faster', 50]
        ]);
    }

    if (isWave(30)) {
        waves.push([5, ['taunt', 'faster', 'faster', 'faster', 50]]);
        waves.push([5, ['taunt', 'tank', 'tank', 'tank', 50]]);
        waves.push([5, ['taunt', 'medic', 'tank', 'tank', 50]]);
        waves.push([1, ['faster', 200]]);
    }

    if (isWave(35)) {
        waves.push([0, ['taunt', 'faster', 200]]);
    }

    return window.random(waves);
}

// Recalculate pathfinding maps
// Algorithm from https://www.redblobgames.com/pathfinding/tower-defense/
function recalculate() {
    walkMap = getWalkMap();
    const frontier = [];
    const target = vts(exit);
    frontier.push(target);
    const cameFrom = {};
    const distance = {};
    cameFrom[target] = null;
    distance[target] = 0;

    // Fill cameFrom and distance for every tile
    while (frontier.length !== 0) {
        var current = frontier.shift();
        const t = stv(current);
        const adj = neighbors(walkMap, t.x, t.y, true);

        for (var i = 0; i < adj.length; i++) {
            var next = adj[i];
            if (!(next in cameFrom) || !(next in distance)) {
                frontier.push(next);
                cameFrom[next] = current;
                distance[next] = distance[current] + 1;
            }
        }
    }

    // Generate usable maps
    dists = buildArray(cols, rows, null);
    const newPaths = buildArray(cols, rows, 0);
    const keys = Object.keys(cameFrom);
    for (var i = 0; i < keys.length; i++) {
        const key = keys[i];
        var current = stv(key);

        // Distance map
        dists[current.x][current.y] = distance[key];

        // Generate path direction for every tile
        const val = cameFrom[key];
        if (val !== null) {
            // Subtract vectors to determine direction
            var next = stv(val);
            const dir = next.sub(current);
            // Fill tile with direction
            if (dir.x < 0) newPaths[current.x][current.y] = 1;
            if (dir.y < 0) newPaths[current.x][current.y] = 2;
            if (dir.x > 0) newPaths[current.x][current.y] = 3;
            if (dir.y > 0) newPaths[current.x][current.y] = 4;
        }
    }

    // Preserve old paths on path tiles
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (grid[x][y] === 2) newPaths[x][y] = paths[x][y];
        }
    }

    paths = newPaths;
}

// TODO vary health based on map
function resetGame(pause_game = true) {
    loadMap();
    // Clear all entities
    enemies = [];
    projectiles = [];
    systems = [];
    towers = [];
    newEnemies = [];
    newProjectiles = [];
    newTowers = [];
    // Reset all stats
    health = 40;
    maxHealth = health;
    wave = 0;
    prev_wave_glob = 0;
    steps_glob = 0;
    wcd = 120;
    // Reset all flags
    paused = pause_game;
    scd = 0;
    toCooldown = false;
    toPathfind = false;
    toPlace = false;
    ticks = 0;
}

// Resizes cols, rows, and canvas based on tile size
function resizeMax() {
    cols = 20;
    rows = 20;
    if (render) {
        resizeCanvas(cols * ts, rows * ts, true);
    }
}

// Sell a tower
function sell(t) {
    selected = null;
    if (grid[t.gridPos.x][t.gridPos.y] === 0) toPathfind = true;
    clearInfo();
    cash += t.sellPrice();
    t.kill();
}

// Set a tower to place
function setPlace(t) {
    towerType = t;
    toPlace = true;
    updateInfo(createTower(0, 0, tower[towerType]));
}

// Visualize range of tower
function showRange(t, cx, cy) {
    stroke(255);
    fill(t.color[0], t.color[1], t.color[2], 63);
    const r = (t.range + 0.5) * ts * 2;
    ellipse(cx, cy, r, r);
}

// Display tower information
function updateInfo(t) {
    if (!render) return;
    const name = document.getElementById('name');
    name.innerHTML = '<span style="color:rgb(' + t.color + ')">' + t.title +
        '</span>';
    document.getElementById('cost').innerHTML = 'Cost: $' + t.totalCost;
    document.getElementById('sellPrice').innerHTML = 'Sell price: $' +
        t.sellPrice();
    document.getElementById('upPrice').innerHTML = 'Upgrade price: ' +
        (t.upgrades.length > 0 ? '$' + t.upgrades[0].cost : 'N/A');
    document.getElementById('damage').innerHTML = 'Damage: ' + t.getDamage();
    document.getElementById('type').innerHTML = 'Type: ' +
        t.type.toUpperCase();
    document.getElementById('range').innerHTML = 'Range: ' + t.range;
    document.getElementById('cooldown').innerHTML = 'Avg. Cooldown: ' +
        t.getCooldown().toFixed(2) + 's';
    const buttons = document.getElementById('info-buttons');
    buttons.style.display = toPlace ? 'none' : 'flex';
    document.getElementById('info-div').style.display = 'block';
}

// Update pause button
function updatePause() {
    if (!render) return;
    document.getElementById('pause').innerHTML = paused ? 'Start' : 'Pause';
}

// Update samples status display with wave, health, and cash
function updateStatus() {
    if (!render) return;
    document.getElementById('wave').innerHTML = 'Wave ' + wave;
    document.getElementById('health').innerHTML = 'Health: ' +
        health + '/' + maxHealth;
    document.getElementById('cash').innerHTML = '$' + cash;
}

// Upgrade tower
function upgrade(t) {
    if (godMode || cash >= t.cost) {
        if (!godMode) cash -= t.cost;
        selected.upgrade(t);
        selected.upgrades = t.upgrades ? t.upgrades : [];
        if (render) {
            updateInfo(selected);
        }
    }
}

// Return whether tile is walkable
function walkable(col, row) {
    // Check if wall or tower-only tile
    if (grid[col][row] === 1 || grid[col][row] === 3) return false;
    // Check if tower
    if (getTower(col, row)) return false;
    return true;
}


// Main p5 functions
function preload() {
    if (!render) return;
    loadSounds();
}

function setup() {
    if (!render) return;
    const div = document.getElementById('sketch-holder');
    const canvas = createCanvas(div.offsetWidth, div.offsetHeight);
    canvas.parent('sketch-holder');
    resetGame();

}

let verboseActions = {
    0: "Do nothing",
    1: "Place Tower",
    2: "Upgrade",
    3: "Sell"
};

let steps_glob = 0;
function draw() {
    // Apply actions after first frame
    let action_phase = steps_glob % actionsPerWave !== 0 || steps_glob === 0;
    if (bot_play && wave > 0 && action_phase && prev_wave_glob !== wave) {
        steps_glob++;
        let done = health <= 0 || wave >= 40;
        let obs = null;
        if (done) {
            console.log("Resetting remote env");
            remoteResetModel();
            obs = env.reset();
            window.loop();
        } else {
            obs = getObservation();
        }
        done = health <= 0 || wave >= 40;

        let actions = remoteGetActions(obs, done)["action"];
        console.log(`[${verboseActions[actions[0]]}, ${tower.idToName[actions[1] + 1]}, ${actions[2]}, ${actions[3]}]`);
        applyActions(actions);
        tickWithoutRender();
        return;
    }
    if(prev_wave_glob !== wave){
        steps_glob = 0;
    }
    prev_wave_glob = wave;
    background(bg);

    // Update samples status
    updatePause();
    updateStatus();

    // Update spawn and wave cooldown
    if (!paused) {
        if (scd > 0) scd--;
        if (wcd > 0 && toWait) wcd--;
    }

    // Draw basic tiles
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            var t = tiles[display[x][y]];
            if (typeof t === 'function') {
                t(x, y, displayDir[x][y]);
            } else {
                stroke(border, borderAlpha);
                t ? fill(t) : noFill();
                rect(x * ts, y * ts, ts, ts);
            }
        }
    }

    // Draw spawnpoints
    for (var i = 0; i < spawnpoints.length; i++) {
        stroke(255);
        fill(0, 230, 64);
        var s = spawnpoints[i];
        rect(s.x * ts, s.y * ts, ts, ts);
    }

    // Draw exit
    stroke(255);
    fill(207, 0, 15);
    rect(exit.x * ts, exit.y * ts, ts, ts);

    // Draw temporary spawnpoints
    for (var i = 0; i < tempSpawns.length; i++) {
        stroke(255);
        fill(155, 32, 141);
        var s = tempSpawns[i][0];
        rect(s.x * ts, s.y * ts, ts, ts);
    }

    // Spawn enemies
    if (canSpawn() && !paused) {
        // Spawn same enemy for each spawnpoint
        const name = newEnemies.shift();
        for (var i = 0; i < spawnpoints.length; i++) {
            var s = spawnpoints[i];
            var c = center(s.x, s.y);
            enemies.push(createEnemy(c.x, c.y, enemy[name]));
        }

        // Temporary spawnpoints
        for (var i = 0; i < tempSpawns.length; i++) {
            var s = tempSpawns[i];
            if (s[1] === 0) continue;
            s[1]--;
            var c = center(s[0].x, s[0].y);
            enemies.push(createEnemy(c.x, c.y, enemy[name]));
        }

        // Reset cooldown
        toCooldown = true;
    }

    // Update and draw enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        // Update direction and position
        if (!paused) {
            e.steer();
            e.update();
            e.onTick();
        }

        // Kill if outside map
        if (outsideMap(e)) e.kill();

        // If at exit tile, kill and reduce player health
        if (atTileCenter(e.pos.x, e.pos.y, exit.x, exit.y)) e.onExit();

        // Draw
        e.draw();

        if (e.isDead()) enemies.splice(i, 1);
    }

    // Draw health bars
    if (healthBar) {
        for (var i = 0; i < enemies.length; i++) {
            enemies[i].drawHealth();
        }
    }

    // Update and draw towers
    for (let i = towers.length - 1; i >= 0; i--) {
        let t = towers[i];

        // Target enemies and update cooldowns
        if (!paused) {
            t.target(enemies);
            t.update();
        }

        // Kill if outside map
        if (outsideMap(t)) t.kill();

        // Draw
        t.draw();

        if (t.isDead()) towers.splice(i, 1);
    }

    // Update and draw particle systems
    for (let i = systems.length - 1; i >= 0; i--) {
        let ps = systems[i];
        ps.run();
        if (ps.isDead()) systems.splice(i, 1);
    }

    // Update and draw projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];

        if (!paused) {
            p.steer();
            p.update();
        }

        // Attack target
        if (p.reachedTarget()) p.explode();

        // Kill if outside map
        if (outsideMap(p)) p.kill();

        p.draw();

        if (p.isDead()) projectiles.splice(i, 1);
    }

    // Draw range of tower being placed
    if (doRange()) {
        var p = gridPos(mouseX, mouseY);
        var c = center(p.x, p.y);
        var t = createTower(0, 0, tower[towerType]);
        showRange(t, c.x, c.y);

        // Draw a red X if tower cannot be placed
        if (!canPlace(p.x, p.y)) {
            push();
            translate(c.x, c.y);
            rotate(PI / 4);

            // Draw a red X
            noStroke();
            fill(207, 0, 15);
            const edge = 0.1 * ts;
            const len = 0.9 * ts / 2;
            rect(-edge, len, edge * 2, -len * 2);
            rotate(PI / 2);
            rect(-edge, len, edge * 2, -len * 2);

            pop();
        }
    }

    // Update FPS meter
    if (showFPS) calcFPS();

    // Show if god mode active
    if (godMode) {
        // Draw black rect under text
        noStroke();
        fill(0);
        rect(0, 0, 102, 22);

        fill(255);
        text('God Mode Active', 5, 15);
    }

    // Show if towers are disabled
    if (stopFiring) {
        // Draw black rect under text
        noStroke();
        fill(0);
        rect(width - 60, 0, 60, 22);

        fill(255);
        text('Firing off', width - 55, 15);
    }

    removeTempSpawns();

    projectiles = projectiles.concat(newProjectiles);
    towers = towers.concat(newTowers);
    newProjectiles = [];
    newTowers = [];

    // If player is dead, reset samples
    if (health <= 0) {
        return true;
    }

    // Start next wave
    if (toWait && wcd === 0 || skipToNext && newEnemies.length === 0) {
        toWait = false;
        wcd = 0;
        nextWave();
    }

    // Wait for next wave
    if (noMoreEnemies() && !toWait) {
        wcd = waveCool;
        toWait = true;
    }

    // Reset spawn cooldown
    if (toCooldown) {
        scd = spawnCool;
        toCooldown = false;
    }

    // Recalculate pathfinding
    if (toPathfind) {
        recalculate();
        toPathfind = false;
    }

    return false;
}

function tickWithoutRender() {
    let oldMute = muteSounds;
    let oldRender = render;
    let oldParticles = showEffects;

    showEffects = false;
    render = false;
    muteSounds = true;
    // Update spawn and wave cooldown
    if (!paused) {
        if (scd > 0) scd--;
        if (wcd > 0 && toWait) wcd--;
    }

    // Spawn enemies
    if (canSpawn() && !paused) {
        // Spawn same enemy for each spawnpoint
        const name = newEnemies.shift();
        for (var i = 0; i < spawnpoints.length; i++) {
            var s = spawnpoints[i];
            var c = center(s.x, s.y);
            enemies.push(createEnemy(c.x, c.y, enemy[name]));
        }

        // Temporary spawnpoints
        for (var i = 0; i < tempSpawns.length; i++) {
            var s = tempSpawns[i];
            if (s[1] === 0) continue;
            s[1]--;
            var c = center(s[0].x, s[0].y);
            enemies.push(createEnemy(c.x, c.y, enemy[name]));
        }

        // Reset cooldown
        toCooldown = true;
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        // Update direction and position
        if (!paused) {
            e.steer();
            e.update();
            e.onTick();
        }

        // Kill if outside map
        if (outsideMap(e)) e.kill();

        // If at exit tile, kill and reduce player health
        if (atTileCenter(e.pos.x, e.pos.y, exit.x, exit.y)) e.onExit();

        if (e.isDead()) enemies.splice(i, 1);
    }

    // Update towers
    for (let i = towers.length - 1; i >= 0; i--) {
        let t = towers[i];

        // Target enemies and update cooldowns
        if (!paused) {
            t.target(enemies);
            t.update();
        }

        // Kill if outside map
        if (outsideMap(t)) t.kill();

        if (t.isDead()) towers.splice(i, 1);
    }


    // Update  projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];

        if (!paused) {
            p.steer();
            p.update();
        }

        // Attack target
        if (p.reachedTarget())
            p.explode();

        // Kill if outside map
        if (outsideMap(p))
            p.kill();


        if (p.isDead())
            projectiles.splice(i, 1);
    }

    removeTempSpawns();

    projectiles = projectiles.concat(newProjectiles);
    towers = towers.concat(newTowers);
    newProjectiles = [];
    newTowers = [];

    muteSounds = oldMute;
    render = oldRender;
    showEffects = oldParticles;

    // If player is dead, reset samples
    if (health <= 0) {
        return true;
    }

    // Start next wave
    if (toWait && wcd === 0 || skipToNext && newEnemies.length === 0) {
        toWait = false;
        wcd = 0;
        nextWave();
    }

    // Wait for next wave
    if (noMoreEnemies() && !toWait) {
        wcd = waveCool;
        toWait = true;
    }

    // Reset spawn cooldown
    if (toCooldown) {
        scd = spawnCool;
        toCooldown = false;
    }

    // Recalculate pathfinding
    if (toPathfind) {
        recalculate();
        toPathfind = false;
    }
    return false;
}


// User input
function keyPressed() {
    switch (keyCode) {
        case 27:
            // Esc
            toPlace = false;
            clearInfo();
            break;
        case 32:
            // Space
            pause();
            break;
        case 49:
            // 1
            setPlace('gun');
            break;
        case 50:
            // 2
            setPlace('laser');
            break;
        case 51:
            // 3
            setPlace('slow');
            break;
        case 52:
            // 4
            setPlace('sniper');
            break;
        case 53:
            // 5
            setPlace('rocket');
            break;
        case 54:
            // 6
            setPlace('bomb');
            break;
        case 55:
            // 7
            setPlace('tesla');
            break;
        case 70:
            // F
            showFPS = !showFPS;
            break;
        case 71:
            // G
            godMode = !godMode;
            break;
        case 72:
            // H
            healthBar = !healthBar;
            break;
        case 77:
            // M
            importMap(prompt('Input map string:'));
            break;
        case 80:
            // P
            showEffects = !showEffects;
            if (!showEffects) systems = [];
            break;
        case 81:
            // Q            stopFiring = !stopFiring;
            break;
        case 82:
            // R
            resetGame();
            break;
        case 83:
            // S
            if (selected) sell(selected);
            break;
        case 85:
            // U
            if (selected && selected.upgrades.length > 0) {
                upgrade(selected.upgrades[0]);
            }
            break;
        case 86:
            // V
            muteSounds = !muteSounds;
            break;
        case 87:
            // W
            skipToNext = !skipToNext;
            break;
        case 88:
            // X
            copyToClipboard(exportMap());
            break;
        case 90:
            // Z
            ts = zoomDefault;
            resizeMax();
            resetGame();
            break;
        case 219:
            // Left bracket
            if (ts > 16) {
                ts -= tileZoom;
                resizeMax();
                resetGame();
            }
            break;
        case 221:
            // Right bracket
            if (ts < 40) {
                ts += tileZoom;
                resizeMax();
                resetGame();
            }
            break;
    }
}

function mousePressed() {
    if (!mouseInMap()) return;
    const p = gridPos(mouseX, mouseY);
    const t = getTower(p.x, p.y);

    if (t) {
        // Clicked on tower
        selected = t;
        toPlace = false;
        updateInfo(selected);
    } else if (canPlace(p.x, p.y)) {
        buy(createTower(p.x, p.y, tower[towerType]));
    }
}