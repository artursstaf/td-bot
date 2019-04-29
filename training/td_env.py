import gym
from gym import spaces
import numpy as np

from training.env_wrapper import JsTdWrap


class TdEnv(gym.Env):

    def __init__(self):
        super(TdEnv, self).__init__()
        self.JsEnv = JsTdWrap()
        # Define spaces
        self.action_space = spaces.MultiDiscrete([3, 3, 5])
        self.observation_space = spaces.Dict({
            'grid': spaces.Box(low=0, high=17, shape=(2, 4)),
            'wave': spaces.Box(low=0, high=1000, shape=()),
            'health': spaces.Box(low=0, high=40, shape=()),
            'cash': spaces.Box(low=0, high=10000, shape=()),
            'alive_enemies_type_and_pos': spaces.Box(low=0, high=60, shape=(700, 3))
        })

    def reset(self):
        return np.array(self.JsEnv.reset())

    def render(self, **kwargs):
        pass

    def step(self, action):
        action = action.tolist()
        return np.array(self.JsEnv.step(action))
