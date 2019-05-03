# %%
import traceback
from functools import reduce

import gym
from gym import spaces
import numpy as np
from training.env_wrapper import JsTdWrap
from training.td_callback import log_dir

cols = 22
rows = 22
rec_enemies = 100
obs_shape = cols * rows + 1 + 1 + 1 + 3 * rec_enemies


def _preprocess_observation(obs):
    grid, wave, health, cash, alive_enemies = obs

    grid = np.reshape(np.array(grid, dtype='float32'), cols * rows)
    wave = np.array([wave], dtype='float32') / 36
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
        self.action_space = spaces.MultiDiscrete([4, 7, cols, rows])
        # Dummy space
        self.observation_space = TdObsSpace()

    def reset(self):
        return _preprocess_observation(self.JsEnv.reset())

    def render(self, **kwargs):
        pass

    def step(self, action):
        action = action.tolist()
        # Catch exceptions because game is not stable
        # Shouldnt happen too often, just reset and go again.

        try:
            obs, reward, done = self.JsEnv.step(action)
        except:
            with open(log_dir + "/err_log.txt", "a") as f:
                traceback.print_exc(file=f)
            obs, reward, done = (self.JsEnv.get_pure_obs(), 0, True)

        #print(f"Episode:{self.episode} wave:{obs[1]} cash:{obs[3]} reward:{reward} health:{obs[2]} done:{done} action:{action}")
        info = {}
        self.r += reward
        self.l += 30
        if done:
            print(f"episode: {self.episode} wave_reached {obs[1]}")
            self.episode += 1
            info['episode'] = {'r': self.r, 'l': self.l}
            self.r = 0
            self.l = 0

        return _preprocess_observation(obs), reward, done, info


class TdObsSpace:
    def __init__(self):
        self.dtype = np.dtype(np.float32)
        self.shape = (obs_shape,)

    def __eq__(self, other):
        return self.dtype == other.dtype and self.shape == other.shape


# %%
if __name__ == "__main__":
    env = TdEnv()
    x = env.reset()
