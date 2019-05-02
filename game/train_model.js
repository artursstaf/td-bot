async function train() {
    render = false;
    godMode = true;
    for(let i = 0; i < 100000000; i++){
        env.reset();
        while(wave <= 37){
            env.step(randomAction());
        }
        console.log("Ep end" + " wave" + wave)
    }


/*    let start = new Date().getTime();
    for (let y = 0; y < 2000; y++) {
        let obs = env.reset();
        for (let i = 0; i < 10000000; i++) {
            [obs, reward, done] = env.step(randomAction());
            console.log(`Step ${i}, reward ${reward} health: ${health}`);
            if (done) break;
        }
        console.log("Epoch end");
    }

    console.log(new Date().getTime() - start);*/
}

function countSteps(){
    let i = 0;
    render = false;
    env.reset();
    while(wave < 400){
        [obs, reward, done] = env.step(randomAction());
        i++;
        console.log(`Step: ${i} wave: ${wave}, enemies: ${enemies.length}`);
    }
}