<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo-container">
        <div v-if="systemSettings.logo" style="text-align: center;">
          <img :src="systemSettings.logo" alt="Logo" style="max-height: 80px; max-width: 100%; object-fit: contain;">
          <div style="font-weight: bold; font-size: 20px; color: var(--primary-color); margin-top: 10px;">{{ systemSettings.systemName }}</div>
        </div>
        <div v-else class="logo-placeholder">
          <i class="fa-solid fa-camera-retro"></i>
          <span>{{ systemSettings.systemName }}</span>
        </div>
      </div>
      
      <hr style="margin-bottom: 30px; border: 0; border-top: 1px solid #eee;">

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <div class="label-header">
            <label for="email">Email</label>
          </div>
          <input type="email" id="email" v-model="email" placeholder="Email" required>
        </div>

        <div class="form-group">
          <div class="label-header">
            <label for="password">Password</label>
          </div>
          <div class="password-input-wrapper">
            <input :type="showPassword ? 'text' : 'password'" id="password" v-model="password" placeholder="Password" required>
            <i class="fa-solid eye-icon" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'" @click="showPassword = !showPassword"></i>
          </div>
        </div>

        <button type="submit" class="btn-login">Log in</button>
      </form>

      <div class="powered-by">
        Powered by Infrane Labs
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { systemSettings, currentUser, loginUser } from '../composables/useSettings'

const router = useRouter()
const email = ref('system@sithurasa.com')
const password = ref('masterpass123')
const showPassword = ref(false)

const handleLogin = async () => {
  try {
    if (email.value === 'system@sithurasa.com' && password.value === 'masterpass123') {
      loginUser({ email: email.value, role: 'admin' })
      router.push('/dashboard')
    } else {
      alert("Invalid Master Admin credentials. Please check your login details.")
    }
  } catch (error) {
    alert("Login Failed: " + error.message)
  }
}
</script>
