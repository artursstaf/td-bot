import numpy as np
import tensorflow as tf
from stable_baselines.a2c.utils import linear
from stable_baselines.common.policies import ActorCriticPolicy, nature_cnn

from training.td_env import obs_shape, cols, rows


class TdPolicy3(ActorCriticPolicy):
    """
    Policy object that implements actor critic, using LSTMs.

    :param sess: (TensorFlow session) The current TensorFlow session
    :param ob_space: (Gym Space) The observation space of the environment
    :param ac_space: (Gym Space) The action space of the environment
    :param n_env: (int) The number of environments to run
    :param n_steps: (int) The number of steps to run for each environment
    :param n_batch: (int) The number of batch to run (n_envs * n_steps)
    """

    def __init__(self, sess, ob_space, ac_space, n_env, n_steps, n_batch, reuse=True, **kwargs):

        # Preprocess observations
        observation_ph = tf.placeholder(shape=(n_batch, obs_shape), dtype=tf.float32, name='Ob')
        obs_phs = (observation_ph, observation_ph)

        super(TdPolicy3, self).__init__(sess, ob_space, ac_space, n_env, n_steps, n_batch, scale=True, obs_phs=obs_phs)
        act_fun = tf.nn.relu

        with tf.variable_scope("model", reuse=False):
            latent = tf.layers.flatten(self.processed_obs)
            fl_gr_c = cols * rows
            num_tows = 15

            # restore original data shapes
            grid = latent[:, 0:fl_gr_c]
            wave = latent[:, fl_gr_c:fl_gr_c + 1]
            health = latent[:, fl_gr_c + 1:fl_gr_c + 2]
            cash = latent[:, fl_gr_c + 2:fl_gr_c + 3]
            exit2 = latent[:, fl_gr_c + 3:fl_gr_c + 5]
            spawns = latent[:, fl_gr_c + 5:fl_gr_c + 9]
            tows = latent[:, fl_gr_c + 10:]

            # Grid CNN
            grid = tf.reshape(grid, [tf.shape(grid)[0], cols, rows, 1])
            grid = nature_cnn(grid, pad="SAME")

            # Non spatial
            non_spatial = tf.concat((wave, health, cash, exit2, spawns), axis=-1)


            # towers
            tows = tf.reshape(tows, [tf.shape(tows)[0], num_tows, 3])
            tower_ids = tows[:, :, 0]
            rest = tows[:, :, 1:3]
            tower_embeddings_descr = tf.get_variable("tower_embeddings", [14, 3])
            tower_embeddings = tf.nn.embedding_lookup(tower_embeddings_descr, tf.cast(tower_ids, tf.int32))
            tows = tf.concat((tower_embeddings, rest), axis=-1)
            tows = tf.layers.dense(tows, 16, activation=tf.nn.relu, name="towers_fc1")
            tows = tf.layers.flatten(tows)

            # combine
            latent = tf.concat((grid, non_spatial, tows), axis=-1)
            latent = act_fun(linear(latent, "shared_fc1", 512, init_scale=np.sqrt(2)))

            # Build the non-shared part of policy and value network
            latent_policy = act_fun(linear(latent, "pi_fc1", 512, init_scale=np.sqrt(2)))
            latent_value = act_fun(linear(latent, "vf_fc1", 256, init_scale=np.sqrt(2)))

            self.value_fn = linear(latent_value, 'vf', 1)
            self.proba_distribution, self.policy, self.q_value = \
                self.pdtype.proba_distribution_from_latent(latent_policy, latent_value, init_scale=0.01)

        self.initial_state = None
        self._setup_init()

    def step(self, obs, state=None, mask=None, deterministic=False):
        if deterministic:
            action, value, neglogp = self.sess.run([self.deterministic_action, self._value, self.neglogp],
                                                   {self.obs_ph: obs})
        else:
            action, value, neglogp = self.sess.run([self.action, self._value, self.neglogp],
                                                   {self.obs_ph: obs})
        return action, value, self.initial_state, neglogp

    def proba_step(self, obs, state=None, mask=None):
        return self.sess.run(self.policy_proba, {self.obs_ph: obs})

    def value(self, obs, state=None, mask=None):
        return self.sess.run(self._value, {self.obs_ph: obs})
