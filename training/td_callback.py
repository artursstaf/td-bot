import numpy as np

from stable_baselines.results_plotter import load_results, ts2xy

best_mean_reward, n_steps = -np.inf, 0
log_dir = "/home/arturs/Projects/td-bot/tensorboard_logs"
model_dir = "/home/arturs/Projects/td-bot/trained_models/"


def td_callback_fn(_locals, _globals):
    global n_steps
    if n_steps % 50 == 0 and n_steps is not 0:
        _locals['self'].save(model_dir + f'ppo_{n_steps}.pkl')
    n_steps += 1
    return True
