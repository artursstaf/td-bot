import time
from multiprocessing import Pool as ThreadPool
from gym import spaces
from stable_baselines import PPO2, PPO1
from stable_baselines.common.input import observation_input
from stable_baselines.common.policies import MlpPolicy, LstmPolicy
import tensorflow as tf
from tensorflow.python.keras.layers import Embedding
from training.benchmarking_testing.benchmark_wrapper import run10k_episodes
from training.env_wrapper import JsTdWrap
from training.td_env import TdEnv

# %% Testing policy creation
env = TdEnv()
model = PPO1(MlpPolicy, env, verbose=1)
model.learn(total_timesteps=60000)

# %% TensorFlow tensors
ten1 = tf.constant(2)
name = tf.one_hot(ten1, 3)
print(name.eval())

ten2 = tf.constant(5)
name2 = tf.one_hot(ten2, 6)

print(tf.concat([name, name2], axis=0).eval())

x = spaces.MultiDiscrete([3, 3, 5])
y, z = observation_input(x)

# %% Python multi-threading

