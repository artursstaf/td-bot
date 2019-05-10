# %%
import traceback
from functools import reduce

import gym
from gym import spaces
import numpy as np
from training.env_wrapper import JsTdWrap
from training.td_callback import log_dir

cols = 20
rows = 20
obs_shape = cols * rows + 1 + 1 + 1 + 2 + 4 + 1
step_ticks = 180


def _preprocess_observation(obs):
    grid, wave, health, cash, ehit, spawns = obs

    grid = np.reshape(np.array(grid, dtype='float32'), cols * rows)
    wave = (np.array([wave], dtype='float32') - 20) / 40.0
    health = (np.array([health], dtype='float32') - 20) / 40.0
    orig_cash = np.array([cash], dtype='float32')
    with np.errstate(divide='ignore'):
        cash = np.log(np.array([cash], dtype='float32'))
    cash[np.isneginf(cash)] = 0
    ehit = np.array(ehit, dtype='float32')
    ehit[0] /= cols
    ehit[1] /= rows
    spawns = np.array(spawns, dtype='float32')
    spawns[0] /= cols
    spawns[1] /= rows
    spawns[2] /= cols
    spawns[3] /= rows

    return np.concatenate((grid, wave, health, cash, ehit, spawns, orig_cash), axis=0)


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
        self.l += step_ticks
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
