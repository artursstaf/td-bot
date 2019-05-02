import numpy as np
import tensorflow as tf
from stable_baselines.a2c.utils import batch_to_seq, linear, seq_to_batch, lstm
from stable_baselines.common.policies import ActorCriticPolicy
from tensorflow.python.layers.core import dense
from tensorflow.python.layers.pooling import max_pooling1d

from training.td_env import obs_shape, cols, rows, rec_enemies


class TdPolicy(ActorCriticPolicy):
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

        super(TdPolicy, self).__init__(sess, ob_space, ac_space, n_env, n_steps, n_batch, scale=True, obs_phs=obs_phs)

        n_lstm = 512
        act_fun = tf.nn.relu

        with tf.variable_scope("input", reuse=True):
            self.masks_ph = tf.placeholder(tf.float32, [n_batch], name="masks_ph")  # mask (done t-1)
            # n_lstm * 2 dim because of the cell and hidden states of the LSTM
            self.states_ph = tf.placeholder(tf.float32, [self.n_env, n_lstm * 2], name="states_ph")  # states

        with tf.variable_scope("model", reuse=False):
            latent = tf.layers.flatten(self.processed_obs)
            fl_gr_c = cols * rows

            grid = latent[:, 0:fl_gr_c]
            wave = latent[:, fl_gr_c:fl_gr_c + 1]
            health = latent[:, fl_gr_c + 1:fl_gr_c + 2]
            cash = latent[:, fl_gr_c + 2:fl_gr_c + 3]
            enemies = latent[:, fl_gr_c + 3:]
            enemies = tf.reshape(enemies, [tf.shape(enemies)[0], rec_enemies, 3])

            # Embeddings for grid - tile,tower,block types
            tile_type_embeddings = tf.get_variable("tile_embeddings", [19, 5])
            embedded_tiles = tf.layers.flatten(tf.nn.embedding_lookup(tile_type_embeddings, tf.cast(grid, tf.int32)))
            grid = act_fun(linear(embedded_tiles, "embedding_tiles_fc1", 128, init_scale=np.sqrt(2)))

            # Embeddings for unit types in map
            enemies_type = enemies[:, :, 2:3]
            enemies_coordinates = enemies[:, :, 0:2]

            enemies_type_embeddings = tf.get_variable("enemy_embeddings", [11, 5])
            embedded_enemies = tf.nn.embedding_lookup(enemies_type_embeddings, tf.cast(enemies_type, tf.int32))
            embedded_enemies = tf.squeeze(embedded_enemies, [2])

            # concatenate back enemies to shape (batch, enemies, features)
            enemies = tf.concat((enemies_coordinates, embedded_enemies), axis=-1)
            enemies = dense(enemies, 16, activation=tf.nn.relu)
            enemies = dense(enemies, 16, activation=tf.nn.relu)
            # Max pool to select most important enemies
            enemies = max_pooling1d(enemies, 15, 10)
            enemies = tf.layers.flatten(enemies)

            latent = tf.concat((grid, wave, health, cash, enemies), axis=-1)
            latent = act_fun(linear(latent, "shared_fc1", 256, init_scale=np.sqrt(2)))

            # LSTM
            input_sequence = batch_to_seq(latent, self.n_env, n_steps)
            masks = batch_to_seq(self.masks_ph, self.n_env, n_steps)
            rnn_output, self.snew = lstm(input_sequence, masks, self.states_ph, 'lstm_layer', n_hidden=n_lstm,
                                         layer_norm=True)
            latent = seq_to_batch(rnn_output)

            # Build the non-shared part of policy and value network
            latent_policy = act_fun(linear(latent, "pi_fc1", 256, init_scale=np.sqrt(2)))
            latent_value = act_fun(linear(latent, "vf_fc1", 32, init_scale=np.sqrt(2)))

            self.value_fn = linear(latent_value, 'vf', 1)
            self.proba_distribution, self.policy, self.q_value = \
                self.pdtype.proba_distribution_from_latent(latent_policy, latent_value)

        self.initial_state = np.zeros((self.n_env, n_lstm * 2), dtype=np.float32)
        self._setup_init()

    def step(self, obs, state=None, mask=None, deterministic=False):
        if deterministic:
            return self.sess.run([self.deterministic_action, self._value, self.snew, self.neglogp],
                                 {self.obs_ph: obs, self.states_ph: state, self.masks_ph: mask})
        else:
            return self.sess.run([self.action, self._value, self.snew, self.neglogp],
                                 {self.obs_ph: obs, self.states_ph: state, self.masks_ph: mask})

    def proba_step(self, obs, state=None, mask=None):
        return self.sess.run(self.policy_proba, {self.obs_ph: obs, self.states_ph: state, self.masks_ph: mask})

    def value(self, obs, state=None, mask=None):
        return self.sess.run(self._value, {self.obs_ph: obs, self.states_ph: state, self.masks_ph: mask})
