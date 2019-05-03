from stable_baselines import PPO2

from model_server.apiserver import ApiServer, ApiRoute, ApiError
from training.td_callback import model_dir
from training.td_env import _preprocess_observation


class MyServer(ApiServer):

    @ApiRoute("/model")
    def serve_model(req):
        obs = req["obs"]
        done = req["done"]
        return {"action": predict(obs, done)}

    @ApiRoute("/reset_model")
    def reset_state(req):
        return {"reset": True}


model = None
state = None


def load_model(version):
    global model, state
    model = PPO2.load(model_dir + version)
    state = None


def reset_model():
    state = None


def predict(observation, done):
    global model, state
    observation = _preprocess_observation(observation)

    action, state = model.predict([observation], state=state, mask=[done])
    return action.tolist()
