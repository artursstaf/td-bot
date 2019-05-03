let model = null;
let bot_play = false;


async function train() {
    console.log(remoteResetModel());
    console.log(remoteGetActions(getObservation(), false)["action"]);
}

let url = "http://localhost:8000/";

function remoteResetModel() {
    console.log(Get(url + "reset_model"));
}

function remoteGetActions(obs, done) {
    let payload = {"obs": obs, "done": done};
    return GetPost(url + "model", payload);
}

function Get(yourUrl) {
    var Httpreq = new XMLHttpRequest();
    Httpreq.open("GET", yourUrl, false);
    Httpreq.send(null);
    return JSON.parse(Httpreq.responseText);
}

function GetPost(yourUrl, payload) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", yourUrl, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(payload));
    return JSON.parse(xhr.responseText);
}

function countSteps() {
    let i = 0;
    render = false;
    env.reset();
    while (wave < 38) {
        [obs, reward, done] = env.step(randomAction());
        i++;
        console.log(`Step: ${i} wave: ${wave}, enemies: ${enemies.length}`);
    }
}
