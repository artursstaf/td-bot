from sys import argv

from model_server.model_serverv2 import MyServer, load_model

if __name__ == "__main__":
    model = "PPO2_steps_10799.pkl"
    load_model(model)
    print("Launching server on localhost, port:8000")
    MyServer("localhost", 8000).serve_forever()
