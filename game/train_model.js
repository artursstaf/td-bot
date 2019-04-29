async function train() {
    render = false;

    let start = new Date().getTime();

    for (let y = 0; y < 1000; y++) {
        let obs = env.reset();
        for (let i = 0; i < 100000; i++) {
            [obs, reward, done] = env.step(randomAction());
            if (done) break;
        }
        console.log("Epoch end");
    }
    console.log(new Date().getTime() - start);
}
