# %%
import gym
from gym import spaces
import numpy as np
from training.env_wrapper import JsTdWrap

cols = 21
rows = 20
rec_enemies = 100
obs_shape = cols * rows + 1 + 1 + 1 + 3 * rec_enemies


def _preprocess_observation(obs):
    grid, wave, health, cash, alive_enemies = obs

    grid = np.reshape(np.array(grid, dtype='float32'), cols * rows)
    wave = np.array([wave], dtype='float32') / 22
    health = np.array([health], dtype='float32') / 40.0
    cash = np.array([cash], dtype='float32') / 65.0 * 2
    alive_enemies = np.array(alive_enemies, dtype='float32')
    alive_enemies[:, 0:1] /= cols
    alive_enemies[:, 1:2] /= rows
    alive_enemies = np.reshape(alive_enemies, 3 * rec_enemies)

    return np.concatenate((grid, wave, health, cash, alive_enemies), axis=0)


class TdEnv(gym.Env):

    def __init__(self):
        super(TdEnv, self).__init__()
        self.episode = 0
        self.r = 0
        self.l = 0

        self.JsEnv = JsTdWrap()
        # [[buy, upgrade, sell, nothing], [tower type],
        # [one hot X coordinate], [one hot Y coordinate]]
        self.action_space = spaces.MultiDiscrete([4, 7, 21, 20])
        # Dummy space
        self.observation_space = TdObsSpace()

    def reset(self):
        return _preprocess_observation(self.JsEnv.reset())

    def render(self, **kwargs):
        pass

    def step(self, action):
        action = action.tolist()
        obs, reward, done = self.JsEnv.step(action)
        info = {}
        self.r += reward
        self.l += 30
        if done:
            self.episode += 1
            info['episode'] = {'r': self.r, 'l': self.l}
            self.r = 0
            self.l = 0

        return _preprocess_observation(obs), reward, done, info


class TdObsSpace:
    def __init__(self):
        self.dtype = np.dtype(np.float32)
        self.shape = (obs_shape,)


# %%
if __name__ == "__main__":
    env = TdEnv()
    x = env.reset()
