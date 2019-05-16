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
num_tows = 20
obs_shape = cols * rows + 1 + 1 + 1 + 1 + 2 + 4 + num_tows * 3


def _preprocess_observation(obs):
    walk, wave, health, cash, exit_loc, spawns, tows = obs

    walk = np.reshape(np.array(walk, dtype='int32'), cols * rows)
    wave = (np.array([wave], dtype='float32') - 20) / 40.0
    health = (np.array([health], dtype='float32') - 20) / 40.0
    orig_cash = np.array([cash], dtype='float32')
    with np.errstate(divide='ignore'):
        cash = np.log(np.array([cash], dtype='float32'))
    cash[np.isneginf(cash)] = 0
    exit_loc = np.array(exit_loc, dtype='float32')
    exit_loc[0] /= cols
    exit_loc[1] /= rows
    spawns = np.array(spawns, dtype='float32')
    spawns[0] /= cols
    spawns[1] /= rows
    spawns[2] /= cols
    spawns[3] /= rows
    tows = np.array(tows, dtype='float32')
    tows[:, 1:3] /= 20
    tows = np.reshape(tows, num_tows * 3)

    return np.concatenate((walk, wave, health, cash, exit_loc, spawns, orig_cash, tows), axis=0)


class TdEnv(gym.Env):

    def __init__(self):
        super(TdEnv, self).__init__()
        self.episode = 0
        self.r = 0
        self.l = 0

        self.JsEnv = JsTdWrap()
        # [[buy, upgrade, sell, nothing], [tower type],
        # [one hot X coordinate], [one hot Y coordinate]]
        self.action_space = spaces.MultiDiscrete([4, 7, cols, rows, num_tows])
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
            # print("Stepping, stuck here??")
            obs, reward, done = self.JsEnv.step(action)
        except:
            print("environment crash")
            with open(log_dir + "/err_log.txt", "a") as f:
                traceback.print_exc(file=f)
            obs, reward, done = (self.JsEnv.get_pure_obs(), 0, True)

        # print(f"Episode:{self.episode} wave:{obs[1]} cash:{obs[3]} reward:{reward} health:{obs[2]} done:{done} action:{action}")
        info = {}
        self.r += reward
        # Wave
        self.l = obs[1]
        if done:
            # print(f"episode: {self.episode} wave_reached {obs[1]}")
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
