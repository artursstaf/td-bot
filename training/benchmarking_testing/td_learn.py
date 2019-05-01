from stable_baselines import PPO2
from stable_baselines.common.vec_env import DummyVecEnv

from training.td_callback import log_dir, td_callback_fn
from training.td_env import TdEnv
from training.td_policy import TdPolicy

env = TdEnv()
env = DummyVecEnv([lambda: env])
model = PPO2(TdPolicy, env, verbose=1, nminibatches=1, tensorboard_log=log_dir, n_steps=256)
model.learn(total_timesteps=100000000000, callback=td_callback_fn)
