import numpy as np
import tensorflow as tf
from stable_baselines.a2c.utils import batch_to_seq, linear, seq_to_batch, lstm
from stable_baselines.common.policies import ActorCriticPolicy
from tensorflow.python.layers.core import dense
from tensorflow.python.layers.pooling import max_pooling1d

from training.td_env import obs_shape, cols, rows


class TdPolicy2(ActorCriticPolicy):
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

        super(TdPolicy2, self).__init__(sess, ob_space, ac_space, n_env, n_steps, n_batch, scale=True, obs_phs=obs_phs)
        act_fun = tf.nn.relu

        with tf.variable_scope("model", reuse=False):
            latent = tf.layers.flatten(self.processed_obs)
            fl_gr_c = cols * rows

            # restore original data shapes
            grid = latent[:, 0:fl_gr_c]
            wave = latent[:, fl_gr_c:fl_gr_c + 1]
            health = latent[:, fl_gr_c + 1:fl_gr_c + 2]
            cash = latent[:, fl_gr_c + 2:fl_gr_c + 3]
            exit2 = latent[:, fl_gr_c + 3:fl_gr_c + 5]
            spawns = latent[:, fl_gr_c + 5:fl_gr_c + 9]
            orig_cash = latent[:, fl_gr_c + 9:fl_gr_c + 10]
            # walkmap iepist, savējos towerus, tips un koord 20x?
            word_embeddings = tf.get_variable("word_embeddings", [19, 5])
            embedded_word_ids = tf.nn.embedding_lookup(word_embeddings, tf.cast(grid, tf.int32))
            embedded_word_ids = tf.layers.flatten(embedded_word_ids)
            embedded_words_fc = act_fun(linear(embedded_word_ids, "grid_fc1", 512, init_scale=np.sqrt(2)))
            embedded_words_fc = act_fun(linear(embedded_words_fc, "grid_fc2", 512, init_scale=np.sqrt(2)))

            encode_misc = tf.concat((wave, health, cash, exit2, spawns, orig_cash), axis=-1)
            encode_misc = act_fun(linear(encode_misc, "misc_fc1", 256, init_scale=np.sqrt(2)))
            encode_misc = act_fun(linear(encode_misc, "misc_fc2", 256, init_scale=np.sqrt(2)))

            latent = tf.concat((embedded_words_fc, encode_misc), axis=-1)
            latent = act_fun(linear(latent, "shared_fc1", 512, init_scale=np.sqrt(2)))
            # Build the non-shared part of policy and value network
            latent_policy = act_fun(linear(latent, "pi_fc1", 512, init_scale=np.sqrt(2)))
            latent_policy = act_fun(linear(latent_policy, "pi_fc2", 512, init_scale=np.sqrt(2)))
            latent_value = act_fun(linear(latent, "vf_fc1", 256, init_scale=np.sqrt(2)))
            latent_value = act_fun(linear(latent_value, "vf_fc2", 256, init_scale=np.sqrt(2)))

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
