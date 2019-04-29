import v8eval


class JsTdWrap(object):

    def __init__(self):
        self.initialized = False
        self.eng = v8eval.V8()
        prefix = "/home/arturs/Projects/td-bot/game/"

        # mock window object
        self.eng.eval("window = {addEventListener: function(){}}")
        self.eng.eval("document = {hasFocus: function(){}}")
        self.eng.eval("screen = {}")
        self.eng.eval("setTimeout = {}")

        scripts = ["scripts/lib/lz-string.min.js",
                   "scripts/lib/p5.min.js",
                   "scripts/utils.js",
                   "scripts/enemy.js",
                   "scripts/enemies.js",
                   "scripts/particle.js",
                   "scripts/particle_system.js",
                   "scripts/effect.js",
                   "scripts/effects.js",
                   "scripts/tower.js",
                   "scripts/towers.js",
                   "scripts/missile.js",
                   "scripts/maps.js",
                   "scripts/tiles.js",
                   "scripts/sketch.js",
                   "game_env.js"]

        # Load all scripts
        for script in scripts:
            with open(prefix + script, 'r') as f:
                self.eng.eval(f.read())

        self.eng.eval("render = false")

    def reset(self):
        """resets game returns observation"""
        if not self.initialized:
            self.initialized = True
        return self.eng.call("envReset", [])

    def step(self, action):
        """takes step in environment returns observation, reward, done"""
        assert self.initialized, "Environment must be initialized before performing step"
        result = self.eng.call("envStep", [action])
        return result[0], result[1], result[2]

    def random_action(self):
        assert self.initialized, "Environment must be initialized before generating random action"
        return self.eng.call("randomAction", [])
