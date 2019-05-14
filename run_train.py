import argparse

from training.benchmarking_testing.td_learn import latest_file, load_from_and_train, fresh_learn
from training.td_callback import model_dir

if __name__ == "__main__":
    latest = latest_file(model_dir)
    print(f"Loading: {latest}")
    load_from_and_train(latest_file(model_dir))
    #fresh_learn()
