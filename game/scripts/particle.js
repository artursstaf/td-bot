class Particle {
    constructor(pos, speed) {
        this.pos = pos.copy();
        this.vel = p5.Vector.random2D().mult(random(-1, 1) * speed * ts / 24);
        this.lifespan = 255;
        this.decay = 2;
        this.color = [0, 0, 0];
        this.radius = 4;
    }

    draw() {
        stroke(0, this.lifespan);
        fill(this.color[0], this.color[1], this.color[2], this.lifespan);
        var r = this.radius * ts / 24 * 2;
        ellipse(this.pos.x, this.pos.y, r, r);
    }

    isDead() {
        return this.lifespan < 0;
    }

    run() {
        if (!paused) this.update();
        this.draw();
    }

    update() {
        this.pos.add(this.vel);
        this.lifespan -= this.decay;
    }
}


class Fire extends Particle {
    constructor(pos, speed) {
        super(pos, speed);
        this.angle = window.random(TWO_PI);
        this.angVel = window.random(-1, 1);
        this.decay = window.random(3, 6);
        this.color = [200 + window.random(55), window.random(127), window.random(31)];
        this.radius = randint(2, 6);
    }

    draw() {
        stroke(0, this.lifespan);
        fill(this.color[0], this.color[1], this.color[2], this.lifespan);
        rectMode(CENTER);
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle);
        var r = this.radius * ts / 24 * 2;
        rect(0, 0, r, r);
        pop();
        rectMode(CORNER);
    }

    update() {
        this.pos.add(this.vel);
        this.angle += this.angVel;
        this.lifespan -= this.decay;
    }
}


class Bomb extends Particle {
    constructor(pos, speed) {
        super(pos, speed);
        this.decay = window.random(8, 10);
        this.color = [151 + window.random(80), 45 + window.random(60), 200 + window.random(55)];
        this.radius = randint(2, 6);
    }
}


class Shrapnel extends Fire {
    constructor(pos, speed) {
        super(pos, speed);
        this.decay = window.random(8, 10);
        var r = 63 + window.random(127);
        this.color = [r, r, r];
        this.radius = randint(2, 6);
    }
}
