<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();
const mode = ref('login');
const resetStep = ref('request');
const loading = ref(false);
const error = ref('');
const success = ref('');
const form = ref({ name: '', email: '', password: '', token: '', newPassword: '' });

// Arrivo dal link dell'email: /login?reset=<token>&email=<email>
onMounted(() => {
  if (route.query.reset) {
    mode.value = 'recover';
    resetStep.value = 'confirm';
    form.value.token = String(route.query.reset);
    form.value.email = String(route.query.email || '');
    router.replace({ name: 'login' });
  }
});

async function submit() {
  loading.value = true;
  error.value = '';
  success.value = '';

  try {
    if (mode.value === 'login') {
      await auth.login({ email: form.value.email, password: form.value.password });
      router.push({ name: 'journeys' });
      return;
    }

    if (mode.value === 'register') {
      await auth.register(form.value);
      router.push({ name: 'journeys' });
      return;
    }

    if (resetStep.value === 'request') {
      const result = await auth.requestPasswordReset(form.value.email);
      success.value = result.message;
      return;
    }

    await auth.confirmPasswordReset({
      email: form.value.email,
      token: form.value.token,
      newPassword: form.value.newPassword
    });
    router.push({ name: 'journeys' });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function switchMode(nextMode) {
  mode.value = nextMode;
  error.value = '';
  success.value = '';
  resetStep.value = 'request';
  form.value = { name: '', email: '', password: '', token: '', newPassword: '' };
}
</script>

<template>
  <section class="auth-screen">
    <form class="card auth-card" @submit.prevent="submit">
      <img class="auth-logo" src="/logo.svg?v=3" alt="Tripsight" />
      <h1>{{ ui.t('auth.title') }}</h1>
      <p v-if="mode === 'recover'">{{ resetStep === 'confirm' ? ui.t('auth.confirmSubtitle') : ui.t('auth.recoverSubtitle') }}</p>
      <p v-else-if="mode === 'register'">{{ ui.t('auth.registerSubtitle') }}</p>
      <p v-else>{{ ui.t('auth.loginSubtitle') }}</p>

      <div v-if="route.query.deleted" class="success">{{ ui.t('auth.deleted') }}</div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">{{ success }}</div>

      <div class="form-grid">
        <label v-if="mode === 'register'" class="field">
          <span>{{ ui.t('auth.name') }}</span>
          <input v-model="form.name" required autocomplete="name" />
        </label>
        <label class="field">
          <span>{{ ui.t('auth.email') }}</span>
          <input v-model="form.email" required autocomplete="email" type="email" />
        </label>
        <label v-if="mode !== 'recover'" class="field">
          <span>{{ ui.t('auth.password') }}</span>
          <input v-model="form.password" required :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" minlength="8" type="password" />
        </label>

        <template v-if="mode === 'recover'">
          <label v-if="resetStep === 'confirm'" class="field">
            <span>{{ ui.t('auth.newPassword') }}</span>
            <input v-model="form.newPassword" required minlength="8" type="password" autocomplete="new-password" />
          </label>
        </template>

        <button class="button" type="submit" :disabled="loading">
          {{ loading ? '...' : mode === 'login' ? ui.t('auth.login') : mode === 'register' ? ui.t('auth.createAccount') : resetStep === 'request' ? ui.t('auth.sendLink') : ui.t('auth.updatePassword') }}
        </button>
        <p v-if="mode === 'register'" class="muted auth-legal">
          {{ ui.t('auth.privacyNotice') }}
          <RouterLink class="text-link" :to="{ name: 'privacy' }">{{ ui.t('auth.privacyLinkInline') }}</RouterLink>.
        </p>
        <button v-if="mode !== 'recover'" class="ghost-button" type="button" @click="switchMode(mode === 'login' ? 'register' : 'login')">
          {{ mode === 'login' ? ui.t('auth.createAnAccount') : ui.t('auth.haveAccount') }}
        </button>
        <button v-if="mode === 'login'" class="ghost-button" type="button" @click="switchMode('recover')">
          {{ ui.t('auth.recover') }}
        </button>
        <button v-if="mode === 'recover'" class="ghost-button" type="button" @click="switchMode('login')">
          {{ ui.t('auth.backLogin') }}
        </button>
      </div>
      <RouterLink class="auth-footer-link" :to="{ name: 'privacy' }">{{ ui.t('auth.privacyLink') }}</RouterLink>
    </form>
  </section>
</template>
