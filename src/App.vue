<template>
  <div class="app-root">
    <router-view></router-view>

    <!-- Automatic Syncing / Updating Overlay for Clients -->
    <div v-if="isUpdating" class="update-overlay">
       <div class="update-card">
          <div class="spinner"></div>
          <h2>Syncing Application</h2>
          <p>Please wait while the latest system files are being prepared...</p>
       </div>
    </div>
    
    <!-- Firebase Update Popup -->
    <div v-if="showUpdatePopup && updateInfo" class="update-overlay">
      <div class="update-box">
        <div class="update-header">
           <i class="fa-solid fa-cloud-arrow-down"></i>
           <div>
             <h2>New Update!</h2>
             <small>Version {{ updateInfo.version }}</small>
           </div>
        </div>
        <div class="update-body">
          <p>A new version of Sithurasa POS is available. Important fixes and improvements have been applied.</p>
          <div class="update-notes">"{{ updateInfo.notes }}"</div>
        </div>
        <div class="update-footer">
          <button @click="goToUpdate" class="btn-update-now">Review & Install</button>
          <button v-if="!updateInfo.mandatory" @click="handleUpdateLater" class="btn-update-later">Later</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import './assets/style.css'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSystemSettings, saveSystemSettings, systemSettings } from './composables/useSettings'
import { checkAppUpdate, triggerUpdateDownload, downloadAndSyncProducts } from './services/updateService'
import { useInputFocusRecovery } from './composables/useInputFocusRecovery'

const router = useRouter()
useInputFocusRecovery()
const showUpdatePopup = ref(false)
const isUpdating = ref(false)
const updateInfo = ref(null)

const handleUpdateLater = () => {
  showUpdatePopup.value = false
}

const goToUpdate = () => {
  showUpdatePopup.value = false
  if (updateInfo.value?.url) {
    isUpdating.value = true
    triggerUpdateDownload(updateInfo.value.url)
  }
}

onMounted(async () => {
  fetchSystemSettings()

  // Startup Update & Branding Check using Firebase Firestore
  try {
     const upData = await checkAppUpdate()
     if (upData) {
        // Skip automatic branding sync to avoid unintended company name changes (e.g., "cmed pharmacy" takeover)
        // if (upData.branding) {
        //    await saveSystemSettings(upData.branding)
        // }
        
        // AUTO-SYNC PRODUCTS for Clients: Download latest global inventory
        if (systemSettings.value.terminalRole === 'client') {
           await downloadAndSyncProducts()
        }
        
        // AUTO-UPDATE for Clients: If a new version is detected, force the update download
        if (upData.version) {
           updateInfo.value = upData
           
           // If it's a client terminal, start update automatically
           if (systemSettings.value.terminalRole === 'client') {
             goToUpdate()
           } else {
             // For Master, show a popup
             showUpdatePopup.value = true
           }
        }
     }
  } catch (err) { /* Fail silently */ }
})
</script>

<style>
/* Global FontAwesome icons styling if needed */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.app-root { position: relative; min-height: 100vh; }

/* Update Popup / Sync Styling */
.update-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at center, #1e293b 0%, #020617 100%);
  display: flex; align-items: center; justify-content: center; z-index: 10000;
  animation: fadeInApp 0.5s ease-out;
}

.update-card, .update-box {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 40px; border-radius: 20px; text-align: center; color: white;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  max-width: 450px;
}

.update-box { background: white; color: #1e293b; text-align: left; }

.spinner {
  width: 60px; height: 60px; border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid #3b82f6; border-radius: 50%;
  margin: 0 auto 20px;
  animation: spinOrbit 1s linear infinite;
}

.update-header i { font-size: 32px; color: #3b82f6; }
.update-header h2 { font-size: 22px; font-weight: 800; margin: 0; }
.update-body { color: #94a3b8; font-size: 14px; line-height: 1.6; }
.update-box .update-body { color: #475569; }
.update-notes { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-top: 10px; font-style: italic; }
.update-box .update-notes { background: #f8fafc; }

.update-footer { display: flex; gap: 10px; margin-top: 10px; }
.btn-update-now { flex: 2; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 700; cursor: pointer; }
.btn-update-later { flex: 1; background: #f1f5f9; color: #64748b; border: none; padding: 12px; border-radius: 8px; font-weight: 700; cursor: pointer; }

@keyframes spinOrbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeInApp { from { opacity: 0; } to { opacity: 1; } }
</style>
