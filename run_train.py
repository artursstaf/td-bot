from training.td_callback import model_dir
from training.td_learn import fresh_learn, load_from_and_train, latest_file

if __name__ == "__main__":
    latest = latest_file(model_dir)
    print(f"Loading: {latest}")

    load_from_and_train(latest_file(model_dir))
   # fresh_lear?n()
