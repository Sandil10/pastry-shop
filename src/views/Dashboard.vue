<template>
  <div class="pos-container" style="background: radial-gradient(circle at top left, #1a2a3a 0%, #0a0e14 100%);">
    <header class="pos-header" style="background: transparent; border-bottom: none;">
      <div class="header-left">
        <div class="user-info-simple">
          <img v-if="systemSettings.logo" :src="systemSettings.logo" alt="Logo" class="user-avatar-simple" style="object-fit: contain;">
          <div v-else class="user-avatar-simple">S</div>
          <span style="font-weight: 600; color: white; display: inline-block;">{{ systemSettings.systemName }}</span>
        </div>
      </div>
      <div class="header-right">
        <button @click="logout" style="background:#28a745; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer;" title="Logout">
          <i class="fa-solid fa-power-off"></i> Logout
        </button>
      </div>
    </header>

    <main class="pos-main" style="display: flex; flex-direction: column; padding: 40px; background: transparent; width: 100%;">
      <div class="app-grid">
        <router-link to="/register" class="app-box">
          <div class="app-icon">
            <img src="/register.jpg" alt="Register" style="width: 100%; height: 100%; object-fit: cover; border-radius: 18px;" />
          </div>
          <span class="app-label">Register</span>
        </router-link>

        <router-link to="/products" class="app-box">
          <div class="app-icon">
            <img src="/produtcs.jpg" alt="Products" style="width: 100%; height: 100%; object-fit: cover; border-radius: 18px;" />
          </div>
          <span class="app-label">Products</span>
        </router-link>

        <router-link to="/analytics" class="app-box">
          <div class="app-icon">
            <img src="/dashboard.png" alt="Dashboard" style="width: 100%; height: 100%; object-fit: cover; border-radius: 18px;" />
          </div>
          <span class="app-label">Dashboard</span>
        </router-link>

        <router-link v-if="currentUser.role === 'admin'" to="/settings" class="app-box">
          <div class="app-icon">
            <img src="/settings.png" alt="Settings" style="width: 100%; height: 100%; object-fit: cover; border-radius: 18px;" />
          </div>
          <span class="app-label">Admin Settings</span>
        </router-link>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
// Removed Firebase imports
import { systemSettings, currentUser } from '../composables/useSettings'

const router = useRouter()
const logout = async () => {
  try {
    router.push('/')
  } catch (err) {
    console.error(err)
  }
}

</script>

<style scoped>
.dashboard-header {
    justify-content: flex-end;
    margin-bottom: 100px;
}

.username {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.app-icon {
  width: 85px;
  height: 85px;
  border-radius: 22px;
  font-size: 38px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3), inset 0 0 15px rgba(255,255,255,0.1);
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
}

.register-icon-premium {
  background: linear-gradient(145deg, #FF5F6D 0%, #FFC371 100%) !important;
}

.products-icon-premium {
  background: linear-gradient(145deg, #00d2ff 0%, #3a7bd5 100%) !important;
}

.analytics-icon-premium {
  background: linear-gradient(145deg, #8E2DE2 0%, #4A00E0 100%) !important;
}

.settings-icon-premium {
  background: linear-gradient(145deg, #434343 0%, #000000 100%) !important;
}

.app-label {
    margin-top: 5px;
    font-size: 15px;
    font-weight: 600;
}
</style>
