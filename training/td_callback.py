import numpy as np

from stable_baselines.results_plotter import load_results, ts2xy

best_mean_reward, n_steps = -np.inf, 0
log_dir = "/home/arturs/Projects/td-bot/tensorboard_logs"


def td_callback_fn(_locals, _globals):
    global n_steps, best_mean_reward
    if (n_steps + 1) % 1800 == 0:
        _locals['self'].save(log_dir + f'best_model_{n_steps}.pkl')
    n_steps += 1
    return True
