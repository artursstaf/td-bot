
async function train() {
    render = false;
    let obs = env.reset();

    for(let i = 0; i < 10000; i++){
        [obs, reward, done] = env.step([]);
        console.log(reward);
        if(done) break;
    }
}