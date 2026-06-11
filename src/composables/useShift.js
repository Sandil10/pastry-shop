import { ref, computed, watch } from 'vue'

const stored = localStorage.getItem('pos_shift')

let initialState = {
  isRegisterOpen: false,
  openBalance: 0,
  cashierName: '',
  shiftTotals: { cash: 0, card: 0, refunds: 0, discounts: 0 }
}


if (stored) {
  try {
    const data = JSON.parse(stored)
    initialState = { ...initialState, ...data }
  } catch (err) {
    console.error("Shift state corrupted, resetting.", err)
  }
}


export const isRegisterOpen = ref(initialState.isRegisterOpen)
export const openBalance = ref(initialState.openBalance)
export const cashierName = ref(initialState.cashierName)
export const shiftTotals = ref(initialState.shiftTotals)

export const expectedCash = computed(() => Number(openBalance.value) + shiftTotals.value.cash)

let saveTimeout;
watch([isRegisterOpen, openBalance, cashierName, shiftTotals], () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    localStorage.setItem('pos_shift', JSON.stringify({
      isRegisterOpen: isRegisterOpen.value,
      openBalance: openBalance.value,
      cashierName: cashierName.value,
      shiftTotals: shiftTotals.value
    }))
  }, 1000);
}, { deep: true })

export const openRegisterShift = (name, amount) => {
  cashierName.value = name
  openBalance.value = Number(amount)
  isRegisterOpen.value = true
  shiftTotals.value = { cash: 0, card: 0, refunds: 0, discounts: 0 }
}

export const closeRegisterShift = () => {
  isRegisterOpen.value = false
  cashierName.value = ''
  openBalance.value = 0
  shiftTotals.value = { cash: 0, card: 0, refunds: 0, discounts: 0 }
}
