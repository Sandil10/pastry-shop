<template>
  <div class="pos-container">
    <header class="pos-header">
      <div class="header-left">
        <router-link to="/dashboard" class="nav-back">
          <i class="fa-solid fa-arrow-left"></i>
        </router-link>
        <div class="user-info-simple">
          <img v-if="systemSettings.logo" :src="systemSettings.logo" alt="Logo" class="user-avatar-simple" style="object-fit: contain;">
          <div v-else class="user-avatar-simple">S</div>
          <span style="font-weight: 600;">{{ systemSettings.systemName }}</span>
        </div>
      </div>
      <div class="header-right">
        <button @click="logout" style="background:#28a745; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer;" title="Logout">
          <i class="fa-solid fa-power-off"></i> Logout
        </button>
      </div>
    </header>

    <main class="pos-main" style="background-color: #f0f2f5; padding: 40px; display: block; overflow-y: auto;">
      <div class="settings-content">
        <h2 style="margin-bottom: 30px; color: #2c3e50; font-weight: 700;">System Settings</h2>
        
        <!-- Cashier Section -->
        <div class="settings-section">
          <h3 class="section-title">Cashier Management</h3>
          <p class="section-desc">Add names of staff who will use the register.</p>
          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <input type="text" v-model="newCashierName" placeholder="Enter Cashier Name" class="standard-input">
            <button @click.prevent="addCashier" class="btn-add">Add Cashier</button>
          </div>
          
          <div v-if="cashiers.length > 0" class="cashier-list">
            <div v-for="c in cashiers" :key="c.id" class="cashier-row">
              <span>{{ c.name }}</span>
              <button @click.prevent="deleteCashier(c.id)" class="btn-delete-cashier">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
          <div v-else class="empty-state">
             No cashiers added yet. Please add at least one to use the Register.
          </div>
        </div>

        <hr class="separator">

        <!-- Global System Section -->
        <form @submit.prevent="save" class="settings-section">
          <h3 class="section-title">Global Configuration</h3>
          
          <div class="form-item">
            <label>Admin Email (Login ID)</label>
            <input type="text" :value="email" readonly class="standard-input disabled">
          </div>
          
          <div class="form-item">
            <label>New Password</label>
            <input type="password" v-model="newPassword" placeholder="Keep empty to stay same" class="standard-input">
          </div>
          
          <div class="form-item">
            <label>Business / System Name</label>
            <input type="text" v-model="name" class="standard-input">
          </div>

          <div class="form-item">
            <label>Business Address</label>
            <input type="text" v-model="address" class="standard-input" placeholder="Ex: No 123, Main St, City">
          </div>

          <div class="form-item">
            <label>Contact Phone</label>
            <input type="text" v-model="phone" class="standard-input" placeholder="Ex: 011 234 5678">
          </div>
          
          <div class="form-item">
            <label>Company Logo</label>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div v-if="logo" class="logo-preview">
                <img :src="logo" />
              </div>
              <input type="file" accept="image/*" @change="handleLogoUpload" class="file-input">
            </div>
          </div>
          
          <div class="form-item">
            <label>Master Admin PIN (Station Lock PIN)</label>
            <input type="text" v-model="pin" class="standard-input" placeholder="Current PIN: 076850">
          </div>
          
          <button type="submit" class="btn-save-all">Save All Changes</button>
        </form>

        <hr class="separator">

        <!-- Danger Zone -->
        <div class="settings-section danger-zone" style="background: #fff1f2; border: 1px solid #fecaca; padding: 20px; border-radius: 10px;">
           <h3 class="section-title" style="color: #be123c;"><i class="fa-solid fa-triangle-exclamation"></i> Danger Zone</h3>
           <p class="section-desc" style="color: #9f1239;">Permanently delete all business data. This action is irreversible.</p>
           
           <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #fca5a5; margin-bottom: 20px;">
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #b91c1c; line-height: 1.6;">
                <li>Delete all <strong>Inventory & Products</strong></li>
                <li>Delete all <strong>Sales History & Receipts</strong></li>
                <li>Delete all <strong>Return Logs</strong></li>
                <li>Delete all <strong>Register Closing (Shift) Records</strong></li>
                <li style="color: #166534; font-weight: bold; margin-top: 5px;">User accounts and System Settings will be preserved.</li>
              </ul>
           </div>

           <button @click="startWipe" class="btn-wipe">
               <i class="fa-solid fa-trash-can"></i> Wipe All Sales, Inventory & Shift Data
           </button>
        </div>
      </div>
    </main>

    <!-- STEP 1: Admin Auth Modal -->
    <div v-if="showAuthModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 350px;">
        <h3 style="color: #1e293b;"><i class="fa-solid fa-lock"></i> Security Authentication</h3>
        <p style="font-size: 13px; color: #64748b; margin: 10px 0 20px;">Please verify your administrator credentials to access the Wipe command.</p>
        
        <div class="form-item">
          <label>Admin Username</label>
          <input type="text" v-model="authUsername" class="standard-input" placeholder="Enter username">
        </div>
        <div class="form-item">
          <label>Admin Password</label>
          <input type="password" v-model="authPassword" class="standard-input" placeholder="Enter password">
        </div>

        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button @click="showAuthModal = false" class="btn-cancel-wipe">Cancel</button>
          <button @click="verifyAuth" class="btn-wipe-confirm" style="background: #475569;">Verify Identity</button>
        </div>
      </div>
    </div>

    <!-- STEP 2: Custom Wipe Confirmation Modal -->
    <div v-if="showWipeModal" class="modal-overlay">
      <div class="modal-content danger-modal">
        <h3 style="color: #be123c;"><i class="fa-solid fa-triangle-exclamation"></i> Final Confirmation</h3>
        <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 15px 0;">
          Identity Verified. This is your LAST warning. This will PERMANENTLY delete all Sales, Inventory, and Shift data.
        </p>
        
        <div class="form-item" style="margin-top: 20px;">
          <label style="font-weight: bold; font-size: 12px; color: #be123c;">Type DELETE to confirm:</label>
          <input type="text" v-model="wipeConfirmCode" class="standard-input" placeholder="Enter 'DELETE'" style="border: 2px solid #fecaca;" autofocus>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button @click="showWipeModal = false" class="btn-cancel-wipe">Cancel</button>
          <button @click="executeWipe" :disabled="wipeConfirmCode.toUpperCase() !== 'DELETE'" class="btn-wipe-confirm">Confirm Wipe</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db'
import { systemSettings, saveSystemSettings, currentUser, logoutUser, setTerminalRole, isMasterBuild } from '../composables/useSettings'

const router = useRouter()
const logout = async () => { 
  try { 
    logoutUser()
    router.push('/') 
  } catch (err) { console.error(err) } 
}

const email = ref('admin@gmail.com')
const name = ref(systemSettings.value.systemName || 'Sithurasa POS')
const logo = ref(systemSettings.value.logo || null)
const pin = ref(systemSettings.value.masterPin || '076850')
const address = ref(systemSettings.value.address || '')
const phone = ref(systemSettings.value.phone || '')
const newPassword = ref('')

const cashiers = ref([])
const newCashierName = ref('')


// Wipe related
const showAuthModal = ref(false)
const showWipeModal = ref(false)
const wipeConfirmCode = ref('')
const authUsername = ref('')
const authPassword = ref('')

const fetchCashiers = async () => {
    cashiers.value = await db.cashiers.toArray()
}

const addCashier = async () => {
    if(!newCashierName.value.trim()) return
    await db.cashiers.add({ name: newCashierName.value.trim() })
    newCashierName.value = ''
    fetchCashiers()
}

const deleteCashier = async (id) => {
    if(confirm("Permanently delete this cashier profile?")) {
        await db.cashiers.delete(id)
        fetchCashiers()
    }
}

watchEffect(() => {
  name.value = systemSettings.value.systemName || 'Sithurasa POS'
  logo.value = systemSettings.value.logo || null
  pin.value = systemSettings.value.masterPin || '076850'
  address.value = systemSettings.value.address || ''
  phone.value = systemSettings.value.phone || ''
})

onMounted(() => {
    fetchCashiers()
})

const handleLogoUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => { logo.value = event.target.result }
  reader.readAsDataURL(file)
}


const save = async () => {
  try {
    await saveSystemSettings({ 
        systemName: name.value, 
        logo: logo.value,
        masterPin: pin.value,
        address: address.value,
        phone: phone.value
    })
    alert('Settings successfully updated!')
  } catch (err) { alert("Error: " + err.message) }
}

const startWipe = () => {
    showAuthModal.value = true
    authUsername.value = ""
    authPassword.value = ""
}

const verifyAuth = () => {
    // SECURITY CHECK: Verify against current user or hardcoded admin for wipe
    // The user mentioned "pw and user name before wipe"
    const expectedUser = email.value.split('@')[0] // 'admin'
    
    if (authUsername.value === expectedUser && authPassword.value === '123') {
        showAuthModal.value = false
        showWipeModal.value = true
        wipeConfirmCode.value = ""
    } else {
        alert("Invalid Admin Credentials. Wipe Access Denied.")
    }
}

const executeWipe = async () => {
  if (wipeConfirmCode.value.toUpperCase() !== 'DELETE') return
  try {
    await db.sales.clear()
    await db.returns.clear()
    await db.shifts.clear()
    await db.pos_products.clear()
    showWipeModal.value = false
    alert("SYSTEM WIPED SUCCESSFULLY.")
    window.location.reload()
  } catch (err) {
    alert("Wipe failed: " + err.message)
  }
}
</script>

<style scoped>
.settings-content {
    max-width: 700px; margin: 0 auto; background: white; padding: 35px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.05);
}
.settings-section { margin-bottom: 25px; }
.section-title { font-size: 18px; color: #333; font-weight: 700; margin-bottom: 5px; }
.section-desc { font-size: 13px; color: #777; margin-bottom: 20px; }
.standard-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; box-sizing: border-box; }
.standard-input.disabled { background: #f5f5f5; color: #888; }
.btn-add { background: #007bff; color: white; border: none; padding: 0 20px; border-radius: 6px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.cashier-list { border: 1px solid #eee; border-radius: 8px; }
.cashier-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #f9f9f9; }
.btn-delete-cashier { background: transparent; border: none; color: #ff4d4f; cursor: pointer; font-size: 16px; }
.empty-state { padding: 25px; background: #fafafa; text-align: center; color: #999; border-radius: 8px; font-size: 14px; }
.form-item { margin-bottom: 20px; }
.form-item label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #444; }
.logo-preview { width: 64px; height: 64px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
.separator { border: 0; border-top: 1px solid #eee; margin: 30px 0; }
.btn-save-all { width: 100%; padding: 14px; background: #2e7d32; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 16px; cursor: pointer; }
.update-status-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
.status-info { margin-bottom: 15px; }
.status-label { font-size: 14px; color: #64748b; margin-right: 8px; }
.status-value { font-weight: 700; color: #1e293b; }
.btn-check, .btn-download { flex: 1; padding: 12px; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; color: white; }
.btn-check { background: #475569; }
.btn-download { background: #3b82f6; }
.update-actions { display: flex; gap: 10px; }
.btn-publish-all { width: 100%; padding: 12px; background: #e65100; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
.btn-wipe { width: 100%; padding: 15px; background: #be123c; color: white; border: none; border-radius: 8px; font-weight: 800; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.2s; text-transform: uppercase; }
.btn-wipe:hover { background: #9f1239; }

/* MODAL STYLES */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
.modal-content { background: white; padding: 30px; border-radius: 12px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
.danger-modal { background: #fff; padding: 30px; border-radius: 12px; width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); text-align: center; border: 2px solid #fee2e2; }
.btn-cancel-wipe { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; font-weight: bold; cursor: pointer; color: #475569; }
.btn-wipe-confirm { flex: 1; padding: 12px; border-radius: 8px; background: #be123c; color: white; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-wipe-confirm:hover { background: #9f1239; }
.btn-wipe-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
