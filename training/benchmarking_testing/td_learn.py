from stable_baselines import PPO2
from stable_baselines.common.vec_env import DummyVecEnv

from training.td_callback import log_dir, td_callback_fn, model_dir
from training.td_env import TdEnv
from training.td_policy import TdPolicy


def fresh_learn():
    env = TdEnv()
    env.reset()
    env = DummyVecEnv([lambda: env])
    model = PPO2(TdPolicy, env, verbose=1, nminibatches=1, tensorboard_log=log_dir, n_steps=256)
    model.learn(total_timesteps=1000000000000, callback=td_callback_fn)


def load_from_and_train(filename):
    env = TdEnv()
    env.reset()
    env = DummyVecEnv([lambda: env])
    model = PPO2.load(model_dir + filename, env=env, verbose=1, nminibatches=1, tensorboard_log=log_dir, n_steps=256)
    model.learn(total_timesteps=1000000000000, callback=td_callback_fn)


def example_run(filename):
    env = TdEnv()
    env.reset()
    env = DummyVecEnv([lambda: env])

    model = PPO2.load(model_dir + filename)

    state = None
    done = [False]

    for _ in range(1000000):
        action, state = model.predict(obs, state=state, mask=done)
        obs, reward, done, _ = env.step(action)
        if done:
            break


if __name__ == "__main__":
    fresh_learn()
