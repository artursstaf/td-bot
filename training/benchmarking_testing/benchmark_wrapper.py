import time

from training.env_wrapper import JsTdWrap


def run_k_episodes(k):
    env = JsTdWrap()

    start = time.monotonic()
    for _ in range(k):
        env.reset()
        for _ in range(1000000):
            obs, reward, done = env.step(env.random_action())
            if done:
                break
    end = time.monotonic()
    return end - start

if __name__ == "__main__":
    print(run_k_episodes(1000))