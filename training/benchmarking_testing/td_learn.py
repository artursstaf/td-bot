import glob
import os

from stable_baselines import PPO2
from stable_baselines.common import set_global_seeds
from stable_baselines.common.vec_env import DummyVecEnv, SubprocVecEnv

from training.td_callback import log_dir, td_callback_fn, model_dir
from training.td_env import TdEnv
from training.td_policy import TdPolicy
from training.td_policy_2 import TdPolicy2
from training.td_policy_3 import TdPolicy3


def fresh_learn():
    env = TdEnv()
    env.reset()
    env = SubprocVecEnv([make_env() for _ in range(1)], start_method="forkserver")
    model = PPO2(TdPolicy2, env, verbose=1, nminibatches=1, tensorboard_log=log_dir, n_steps=128, gamma=0.99273)
    model.learn(total_timesteps=1000000000000, callback=td_callback_fn)


def load_from_and_train(filename):
    env = TdEnv()
    env.reset()
    env = SubprocVecEnv([make_env() for _ in range(12)], start_method="spawn")
    model = PPO2.load(filename, env=env, verbose=1, nminibatches=1, tensorboard_log=log_dir, n_steps=128,
                      gamma=0.99273)
    model.learn(total_timesteps=1000000000000, callback=td_callback_fn, reset_num_timesteps=False)


def example_run(filename):
    env = TdEnv()
    env = DummyVecEnv([lambda: env])
    obs = env.reset()
    model = PPO2.load(model_dir + filename)

    state = None
    done = [False]
    SubprocVecEnv([make_env() for _ in range(12)], start_method="spawn")
    for _ in range(1000):
        action, state = model.predict(obs, state=state, mask=done)
        obs, reward, done, _ = env.step(action)
        print(action)
        if done:
            break


def make_env(seed=0):
    def _init():
        return TdEnv()

    set_global_seeds(seed)
    return _init


def latest_file(directory):
    list_of_files = glob.glob(directory + '*')
    return max(list_of_files, key=os.path.getctime)


if __name__ == "__main__":
    #latest = latest_file(model_dir)
    #print(f"Loading: {latest}")
    #load_from_and_train(latest_file(model_dir))
    fresh_learn()
