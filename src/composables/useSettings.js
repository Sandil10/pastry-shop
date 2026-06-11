import { ref } from 'vue'
import { db } from '../db'
const rawMode = (import.meta.env.VITE_APP_MODE || 'MASTER').trim().toUpperCase()
const buildRole = rawMode === 'CLIENT' ? 'client' : 'master'

export const systemSettings = ref({
  systemName: 'Sithurasa POS',
  logo: null, // Base64 image
  address: 'No 123, Main Street, City',
  phone: '012 345 6789',
  terminalRole: buildRole, // Build-time role
  masterPin: '076850' // Default PIN
})
export const isMasterBuild = rawMode !== 'CLIENT'
export const isMaster = isMasterBuild

// PERSISTENT SESSION: Check if user was already logged in
const savedUser = JSON.parse(sessionStorage.getItem('pos_current_user') || '{"email":"","role":"user"}')
export const currentUser = ref(savedUser)


export const loginUser = (user) => {
    currentUser.value = user
    sessionStorage.setItem('pos_current_user', JSON.stringify(user))
}

export const logoutUser = () => {
    currentUser.value = { email: '', role: 'user' }
    sessionStorage.removeItem('pos_current_user')
}

export const fetchSystemSettings = async () => {
  try {
    const settings = await db.settings.get('global')
    if (settings) {
      // Merge with systemName, logo, masterPin but NOT terminalRole (role is build-specific)
      const { terminalRole, ...syncedData } = settings
      systemSettings.value = { ...systemSettings.value, ...syncedData }
    }
  } catch (error) {
    console.error("Error fetching system settings:", error)
  }
}

export const setTerminalRole = async (role) => {
  // ROLE IS NOW HARDCODED AT BUILD TIME - This function exists for compatibility but does nothing
  console.warn("Terminal role is build-specific and cannot be changed runtime.")
}

export const saveSystemSettings = async (data) => {
  try {
    const current = await db.settings.get('global') || {}
    const updated = { ...current, ...data, id: 'global' }
    await db.settings.put(updated)
    systemSettings.value = { ...systemSettings.value, ...data }
  } catch (error) {
    console.error("Error saving system settings:", error)
    throw error
  }
}

