<template>
  <div class="pos-container">
    <header class="pos-header">
      <div class="header-left">
        <router-link to="/dashboard" class="nav-back">
          <i class="fa-solid fa-arrow-left"></i>
        </router-link>
        <div class="user-info-simple">
          <img v-if="systemSettings.logo" :src="systemSettings.logo" alt="Logo" class="user-avatar-simple" style="object-fit: contain;">
          <div v-else class="user-avatar-simple">{{ cashierName ? cashierName.charAt(0).toUpperCase() : 'S' }}</div>
          <span style="font-weight: 600;">{{ systemSettings.systemName }}</span>
        </div>

        <button class="btn-return" @click="showReturnPopup = true">
           <i class="fa-solid fa-rotate-left"></i> Return
        </button>
      </div>

      <div class="header-center">
        <!-- Sale Type Dropdown -->
        <div class="sale-type-container">
          <select v-model="saleType" class="sale-type-select">
            <option value="Direct Sale">Direct Sale</option>
            <option value="Bulk Sale">Bulk Sale</option>
          </select>
        </div>
      </div>

      <div class="header-right" style="display: flex; gap: 15px; align-items: center;">
        <div class="search-bar">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search (F1)..." 
            ref="searchBar"
            id="searchBar"
            spellcheck="false"
            @keydown="handleSearchKeydown"
          >
        </div>
        
        <button class="btn-direct-sale" @click="isClosingRegister = true" v-if="isRegisterOpen" style="background:#dc3545; color:white; border:none; padding:8px 15px;">
          Close Register
        </button>
        <button @click="logout" style="background:#28a745; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer;" title="Logout">
          <i class="fa-solid fa-power-off"></i> Logout
        </button>
      </div>
    </header>

    <main class="pos-main">
      <!-- Left Side: Cart & Keypad -->
      <div class="pos-left">
        <div class="cart-header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="cart-title">Order Items</span>
          <button @click="cart = []; billDiscount = 0; selectedCartIndex = null; qtyInputBuffer = '';" class="btn-clear-all" title="Clear Entire Cart">
             <i class="fa-solid fa-trash-can"></i> Clear All
          </button>
        </div>
        <div class="cart-items">
          <div class="cart-item" v-for="(item, index) in cart" :key="index" :class="{ selected: index === selectedCartIndex }" @click="selectedCartIndex = index">
            <div class="item-info">
              <div class="item-controls">
                <button class="btn-qty-minus" @click.stop="decrementQty(index)"><i class="fa-solid fa-minus"></i></button>
                <span class="item-qty">{{ item.qty }}</span>
                <button class="btn-qty-plus" @click.stop="incrementQty(index)"><i class="fa-solid fa-plus"></i></button>
              </div>
              <span class="item-name">{{ item.name }}</span>
            </div>
            <div class="item-actions">
              <span class="item-price">{{ (item.price * item.qty).toFixed(2) }} Rs</span>
              <button class="btn-remove-item" @click="removeFromCart(index)" title="Remove All">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
          <div v-if="cart.length === 0" class="empty-cart">
            Your cart is empty
          </div>
        </div>

        <div class="cart-footer">
          <div v-if="billDiscount > 0 && subtotal > 0" class="total-row discount" style="font-size: 14px; color: #ef4444; border-bottom: 1px dashed #eee; padding-bottom: 8px; margin-bottom: 8px;">
            <span>Discount ({{ billDiscount }}%)</span>
            <span>-{{ discountAmount.toFixed(2) }} Rs</span>
          </div>
          <div class="total-row" style="align-items: flex-end;">
            <span>Total</span>
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <span v-if="billDiscount > 0" style="font-size: 14px; text-decoration: line-through; color: #94a3b8; font-weight: normal; margin-bottom: -4px;">
                {{ subtotal.toFixed(2) }} Rs
              </span>
              <span>{{ total.toFixed(2) }} Rs</span>
            </div>
          </div>

          <div class="pos-keypad">
            <button class="keypad-btn" v-for="n in 9" :key="n" @click="handleNum(n)">{{ n }}</button>
            <button class="keypad-btn action" @click="mode = 'qty'" :class="{ active: mode === 'qty' }">Qty</button>
            <button class="keypad-btn" @click="handleNum(0)">0</button>
            <button class="keypad-btn" @click="handleNum('.')">.</button>
            <button class="keypad-btn action" @click="mode = 'price'" :class="{ active: mode === 'price' }">Price</button>
            <button class="keypad-btn delete-key" @click="handleDelete"><i class="fa-solid fa-delete-left"></i></button>
            <button class="keypad-btn action" 
              @click="mode = mode === 'disc' ? 'qty' : 'disc'; selectedCartIndex = null; qtyInputBuffer = '';" 
              :class="{ active: mode === 'disc' }"
              data-mode="disc">%</button>
          </div>

          <!-- Payment Methods -->
          <div class="payment-methods">
            <button class="payment-btn" :class="{ selected: paymentMethod === 'Card' }" @click="paymentMethod = 'Card'">
              <i class="fa-solid fa-credit-card"></i> Card
            </button>
            <button class="payment-btn" :class="{ selected: paymentMethod === 'Cash' }" @click="paymentMethod = 'Cash'">
              <i class="fa-solid fa-money-bill-1-wave"></i> Cash
            </button>
            <button class="payment-btn" :class="{ selected: mode === 'disc' }" @click="mode = mode === 'disc' ? 'qty' : 'disc'; selectedCartIndex = null; qtyInputBuffer = '';">
              <i class="fa-solid fa-tag"></i> Discount
            </button>
            <button class="btn-complete-payment" :disabled="!paymentMethod || cart.length === 0" @click="preparePayment">
              Payment
            </button>
          </div>
        </div>
      </div>

      <!-- Right Side: Categories & Products -->
      <div class="pos-right">
        <div class="product-grid">
          <div class="product-card" v-for="prod in filteredProducts" :key="prod.id" @click="addToCart(prod)">
            <img v-if="prod.image" :src="prod.image" alt="Product" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom:10px;">
            <div v-else style="width:100%; height:120px; background:#eee; border-radius:6px; margin-bottom:10px; display:flex; align-items:center; justify-content:center; color:#999;">No Image</div>
            <div class="product-name">{{ prod.name }}</div>
            <div class="product-price">Rs. {{ Number(prod.price).toFixed(2) }}</div>
            <div class="product-inventory-info" :class="{ 'red': (prod.stock !== null && prod.stock !== undefined && prod.stock !== '' && prod.stock <= 5) }">
               Stock: {{ (prod.stock === null || prod.stock === undefined || prod.stock === '') ? '∞' : prod.stock }}
            </div>
            <div class="product-qty-badge" v-if="getCartQty(prod.id) > 0">{{ getCartQty(prod.id) }}</div>
          </div>
        </div>
      </div>
    </main>

    <Transition name="bag-toast">
      <div v-if="bagToast.visible" class="bag-toast" role="status" aria-live="polite">
        <div class="bag-toast-icon">
          <i class="fa-solid fa-bag-shopping"></i>
        </div>
        <div class="bag-toast-copy">
          <strong>{{ bagToast.name }}</strong>
          <span>Added to bag</span>
        </div>
        <div class="bag-toast-qty">x{{ bagToast.qty }}</div>
      </div>
    </Transition>

    <div v-if="!isRegisterOpen" class="modal-overlay">
      <div class="modal-content" style="max-width: 400px; padding: 30px;">
        <h2 style="margin-bottom: 5px;">Open Register</h2>
        <p style="color: #777; margin-bottom: 25px; font-size: 14px;">Select cashier and enter opening balance.</p>
        <form @submit.prevent="openRegister">
          <div class="form-group">
            <label>Select Cashier</label>
            <select v-model="cashierName" required style="width: 100%; border:1px solid #ddd; padding: 12px; border-radius: 6px;">
               <option value="" disabled>-- Choose Cashier --</option>
               <option v-for="c in cashierList" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
            <p v-if="cashierList.length === 0" style="font-size: 11px; color: #dc3545; margin-top: 5px;">*No cashiers found. Please add them in Settings.</p>
          </div>
          <div class="form-group">
            <label>Opening Cash Balance (Rs)</label>
            <input type="number" step="0.01" v-model.number="openBalance" ref="openingBalanceInput" id="openingBalanceInput" spellcheck="false" required style="padding: 12px;">
          </div>
          <div class="modal-actions" style="margin-top: 25px; flex-direction: column; gap: 10px;">
            <button type="submit" class="btn-save" style="width:100%; padding: 14px; font-size: 16px;">Start Shift</button>
            <button type="button" @click="router.push('/dashboard')" class="btn-cancel" style="width:100%; padding: 12px; font-weight: bold; border: 1px solid #ddd;">Cancel & Go Home</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Close Register Modal -->
    <div v-if="isClosingRegister" class="modal-overlay">
      <div class="modal-content" style="max-width: 420px; border-top: 5px solid #1e293b;">
        <h2 style="margin-bottom: 20px; color: #1e293b; text-align: center;">Register Closing Summary</h2>
        
        <div class="summary-details" style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <!-- Morning Setup -->
          <p style="display: flex; justify-content: space-between; font-weight: 600; font-size: 15px;">
            <span style="color: #64748b;">MORNING CASH (PUT IN):</span>
            <span style="color: #1e293b;">Rs {{ (Number(openBalance) || 0).toFixed(2) }}</span>
          </p>
          
          <div style="border-top: 1px dashed #cbd5e1; margin: 15px 0;"></div>

          <!-- Earnings Breakdown -->
          <p style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
            <span style="color: #64748b;">SUBTOTAL (FULL PRICE):</span>
            <span style="font-weight: 700;">Rs {{ (shiftTotals.cash + (shiftTotals.discounts || 0)).toFixed(2) }}</span>
          </p>
          <p v-if="shiftTotals.discounts > 0" style="display: flex; justify-content: space-between; font-size: 14px; color: #ef4444; margin-bottom: 15px;">
            <span>TOTAL DISCOUNTS GIVEN:</span>
            <span>- Rs {{ shiftTotals.discounts.toFixed(2) }}</span>
          </p>
          
          <p style="display: flex; justify-content: space-between; font-weight: 800; font-size: 16px; color: #020617; background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <span>CASH EARNED TODAY:</span>
            <span>Rs {{ shiftTotals.cash.toFixed(2) }}</span>
          </p>

          <p style="display: flex; justify-content: space-between; font-size: 14px; color: #0369a1; margin-top: 15px;">
            <span style="font-weight: 600;">CARD EARNED TODAY:</span>
            <span style="font-weight: 800;">Rs {{ shiftTotals.card.toFixed(2) }}</span>
          </p>

          <div style="border-top: 2px solid #1e293b; margin: 15px 0;"></div>

          <!-- The Final Check -->
          <p style="display: flex; justify-content: space-between; font-weight: 900; font-size: 18px; color: #1e293b;">
            <span style="text-transform: uppercase;">SHOULD BE IN DRAWER:</span>
            <span>Rs {{ (Number(expectedCash) || 0).toFixed(2) }}</span>
          </p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: -5px; text-transform: uppercase;">(Morning Cash + Cash Earned Today)</p>
        </div>

        <form @submit.prevent="closeRegister">
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="font-weight: 800; color: #1e293b; font-size: 13px;">ACTUAL CASH COUNTED IN DRAWER (Rs)</label>
            <input type="number" step="0.01" v-model.number="actualCash" ref="actualCashInput" id="actualCashInput" spellcheck="false" placeholder="0.00" required style="font-size: 24px; font-weight: 900; text-align: center; border: 2px solid #6366f1; color: #4338ca; height: 60px;">
          </div>
          
          <div style="background: #fff; border: 2px dashed #e2e8f0; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 10px;">
            <p :style="{ color: cashDifference < 0 ? '#ef4444' : '#059669', fontWeight: '950', fontSize: '20px', margin: '0' }">
              Difference: Rs {{ cashDifference.toFixed(2) }}
            </p>
            <span style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">
              {{ cashDifference < 0 ? '!!! SHORTAGE !!!' : (cashDifference > 0 ? '!!! EXTRA MONEY !!!' : 'PERFECT MATCH') }}
            </span>
          </div>
          <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <span style="font-size: 12px; font-weight: bold; color: #065f46;">TOTAL NET EARNINGS (T0DAY):</span>
            <div style="font-size: 20px; font-weight: 900; color: #065f46;">Rs {{ (shiftTotals.cash + shiftTotals.card).toFixed(2) }}</div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="isClosingRegister = false">Cancel</button>
            <button type="submit" class="btn-save" style="background:#dc3545">Close Shift</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Payment Tender Modal -->
    <div v-if="showPaymentPopup" class="modal-overlay">
      <div class="modal-content">
        <h2>Confirm Payment</h2>
          <div v-if="discountAmount > 0" class="summary-details" style="border-top: 1px dashed #eee; padding-top: 10px; margin-top: 10px; color: #ef4444;">
             <p style="display: flex; justify-content: space-between; font-weight: bold;">
               <span>Subtotal:</span>
               <span>Rs {{ subtotal.toFixed(2) }}</span>
             </p>
             <p style="display: flex; justify-content: space-between; font-weight: bold;">
               <span>Discount ({{ billDiscount }}%):</span>
               <span>- Rs {{ discountAmount.toFixed(2) }}</span>
             </p>
          </div>
          
          <div class="summary-details">
            <p style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px;">
              <span style="font-weight: 900; font-size: 18px; color: #64748b;">Grand Total:</span>
              <span style="display: flex; flex-direction: column; align-items: flex-end;">
                <span v-if="discountAmount > 0" style="font-size: 16px; text-decoration: line-through; color: #94a3b8; font-weight: normal;">Rs {{ subtotal.toFixed(2) }}</span>
                <span style="font-size: 32px; font-weight: 950; color: #1e293b; line-height: 1;">Rs {{ total.toFixed(2) }}</span>
              </span>
            </p>
            <p style="margin-top: 15px; background: #f8fafc; padding: 5px 10px; border-radius: 4px; display: inline-block;"><strong>Payment Method:</strong> {{ paymentMethod }}</p>
          </div>
        <form @submit.prevent="handlePayment">
          <div class="form-group" v-show="paymentMethod === 'Cash'">
            <label>Amount Tendered (Rs)</label>
            <input type="number" step="0.01" v-model.number="amountTendered" ref="amountTenderedInput" id="amountTenderedInput" spellcheck="false" :required="paymentMethod === 'Cash'">
          </div>
          <div class="summary-details" v-show="paymentMethod === 'Cash' && amountTendered >= total">
            <p :style="{ color: 'green', fontWeight: 'bold' }">
              Change: Rs {{ (amountTendered - total).toFixed(2) }}
            </p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showPaymentPopup = false">Cancel</button>
            <button type="submit" class="btn-save" :disabled="paymentMethod === 'Cash' && amountTendered < total">Confirm & Print Bill</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Receipt / Print Bill Popup -->
    <div v-if="showReceipt" class="modal-overlay receipt-modal">
      <div class="modal-content" style="max-width: 300px; padding: 20px;">
        <div id="printSection" class="receipt-printout">
          <div class="receipt-header">
            <img v-if="systemSettings.logo" :src="systemSettings.logo" alt="Logo" class="receipt-logo" />
            <h3 class="receipt-brand">{{ systemSettings.systemName || 'POS System' }}</h3>
            <p class="receipt-address">123 Bakery Street</p>
            <hr class="receipt-divider">
            <div class="receipt-meta">
              <p><span>Date:</span> <span>{{ lastReceipt.date ? new Date(lastReceipt.date).toLocaleString() : new Date().toLocaleString() }}</span></p>
              <p><span>Receipt #:</span> <span>{{ lastReceipt.id }}</span></p>
              <p><span>Cashier:</span> <span>{{ lastReceipt.cashier || cashierName || 'Admin' }}</span></p>
            </div>
            <hr class="receipt-divider">
          </div>
          <table class="receipt-table">
            <thead>
              <tr class="receipt-table-header">
                <th style="text-align:left; width: 55%;">Item</th>
                <th style="text-align:center; width: 15%;">Qty</th>
                <th style="text-align:right; width: 30%;">Amt</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in lastReceipt.items" :key="item.id">
                <td style="text-align:left;" class="item-name-col">{{ item.name }}</td>
                <td style="text-align:center; vertical-align: top;">{{ item.qty }}</td>
                <td style="text-align:right; vertical-align: top;">{{ (item.price * item.qty).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
          <hr class="receipt-divider">
          <div class="receipt-totals">
            <!-- SUBTOTAL & DISCOUNT -->
            <div v-if="lastReceipt.subtotal > lastReceipt.total" class="payment-line" style="font-size: 11px; margin-bottom: 2px;">
              <span>Subtotal:</span>
              <span>{{ lastReceipt.subtotal.toFixed(2) }}</span>
            </div>
            <div v-if="lastReceipt.discountAmount > 0" class="payment-line" style="font-size: 11px; color: #dc2626; margin-bottom: 5px;">
              <span>Discount ({{ lastReceipt.discountPercent }}%):</span>
              <span>-{{ lastReceipt.discountAmount.toFixed(2) }}</span>
            </div>

            <div class="total-line">
              <span>NET TOTAL:</span>
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                 <span v-if="lastReceipt.discountAmount > 0" style="font-size: 12px; text-decoration: line-through; color: #94a3b8; font-weight: normal; margin-bottom: -5px;">{{ lastReceipt.subtotal.toFixed(2) }}</span>
                 <span class="total-bold">Rs {{ lastReceipt.total.toFixed(2) }}</span>
              </div>
            </div>

            <div class="receipt-divider" style="border-top: 1px dashed #ccc; margin: 10px 0;"></div>

            <div class="payment-line">
              <span>Paid via:</span>
              <span style="font-weight: bold;">{{ lastReceipt.method.toUpperCase() }}</span>
            </div>
            <div class="payment-line">
              <span>Cash Received:</span>
              <span>{{ (lastReceipt.tendered || lastReceipt.total).toFixed(2) }}</span>
            </div>
            <div class="payment-line" style="margin-top: 5px; font-size: 15px; font-weight: 900; color: #059669;">
              <span>Change:</span>
              <span>{{ (lastReceipt.change || 0).toFixed(2) }}</span>
            </div>
          </div>
          <hr class="receipt-divider">
          <div class="receipt-footer">
            <p class="greeting">Thank you for visiting!</p>
            <p class="greeting" style="font-size: 16px; margin-top: 2px;">PLEASE COME AGAIN</p>
          </div>
        </div>
        <div class="modal-actions" style="gap: 15px; margin-top: 25px;">
          <button type="button" class="btn-save" @click="printBill" style="flex: 2; padding: 15px; font-size: 18px;">Print Receipt (Enter)</button>
          <button type="button" class="btn-cancel" @click="finishSale" style="flex: 1;">Done (Esc)</button>
        </div>
      </div>
    </div>
    <!-- Return Modal -->
    <div v-if="showReturnPopup" class="modal-overlay">
      <div class="modal-content" style="max-width: 500px;">
        <h2 style="margin-bottom: 20px;">Return Sold Items</h2>
        <div class="form-group">
          <label>Receipt ID (Enter numeric ID)</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" v-model="returnSearchQuery" id="returnSearchInput" spellcheck="false" placeholder="Ex: 1" style="flex:1">
            <button class="btn-save" style="flex:0 0 100px; padding:8px;" @click="searchSale">Search</button>
          </div>
        </div>

        <div v-if="foundSale" class="summary-details" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; max-height: 350px; overflow-y: auto;">
          <p><strong>Found Sale:</strong> #{{ foundSale.id }} ({{ new Date(foundSale.date).toLocaleString() }})</p>
          <p><strong>Total Paid:</strong> Rs {{ foundSale.total.toFixed(2) }} via {{ foundSale.method }}</p>
          
          <table style="width: 100%; margin-top: 15px; font-size: 14px; border-collapse: collapse;">
             <thead>
               <tr style="border-bottom: 1px solid #ddd; background: #fafafa;">
                 <th align="left" style="padding: 8px;">Item</th>
                 <th align="center" style="padding: 8px;">Qty</th>
                 <th align="right" style="padding: 8px;">Amount</th>
               </tr>
             </thead>
             <tbody>
               <tr v-for="(item, idx) in foundSale.items" :key="idx" style="border-bottom: 1px solid #f9f9f9;">
                 <td style="padding: 8px;">{{ item.name }}</td>
                 <td align="center" style="padding: 8px;">{{ item.qty }}</td>
                 <td align="right" style="padding: 8px;">Rs {{ (item.price * item.qty).toFixed(2) }}</td>
               </tr>
             </tbody>
          </table>

          <div style="margin-top: 30px; text-align: center;">
            <button class="btn-save" style="background:#dc3545; width:100%; padding: 12px; font-size: 16px;" @click="confirmReturn">Process Full Return</button>
          </div>
        </div>
        <div v-else-if="returnSearchAttempted" style="margin-top:20px; color:#dc3545; text-align:center;">
          No sale found with this receipt number.
        </div>

        <div class="modal-actions" style="margin-top: 20px;">
          <button type="button" class="btn-cancel" @click="closeReturnPopup">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db'
// Removed Firebase imports
import { systemSettings } from '../composables/useSettings'
import { 
  isRegisterOpen, openBalance, cashierName, shiftTotals, 
  expectedCash, openRegisterShift, closeRegisterShift 
} from '../composables/useShift'

import { preventRestoreOnce } from '../composables/useInputFocusRecovery'

const router = useRouter()
// 2. State Management
const reinforcedFocus = (elRef, delay = 300) => {
  if (!elRef || !elRef.value) return;
  setTimeout(() => {
    if (Date.now() < (window.__skipFocusRestoreUntil || 0)) return;
    // If user has already started typing, don't interrupt
    if (!elRef.value || document.activeElement === elRef.value) return;
    if (document.activeElement?.closest?.('button, a, select, [role="button"], .modal-overlay')) return;
    
    try {
        // Brute-force caret trigger
        elRef.value.blur();
        setTimeout(() => {
            if (elRef.value) {
                elRef.value.focus();
                // Ensure text is selected if it's a number field (so user can type over 0)
                if (elRef.value.tagName === 'INPUT') elRef.value.select();
            }
        }, 50);
    } catch (e) {}

    // Double-check focus stuck
    setTimeout(() => {
      if (Date.now() < (window.__skipFocusRestoreUntil || 0)) return;
      if (elRef.value && document.activeElement !== elRef.value) {
        elRef.value.focus();
      }
    }, 200);
  }, delay);
}

const isClosingRegister = ref(false)
const actualCash = ref(0)
const searchQuery = ref(null) // Safe init
const cart = ref([])
const products = ref([])
const categories = ref(['All'])
const selectedCartIndex = ref(null)
const mode = ref('qty')
const billDiscount = ref(0)
const saleType = ref('Direct Sale')
const paymentMethod = ref(null)
const showPaymentPopup = ref(false)
const amountTendered = ref(0)
const showReceipt = ref(false)
const lastReceipt = ref(null)
const showReturnPopup = ref(false)
const returnSearchQuery = ref('')
const foundSale = ref(null)
const returnSearchAttempted = ref(false)
const cashierList = ref([])
const qtyInputBuffer = ref('')
const bagToast = ref({
  visible: false,
  name: '',
  qty: 1
})
let qtyBufferTimeout = null
let openingWatchdog = null
let bagToastTimer = null

// 3. Template/Focus Refs (Initialized early)
const openingBalanceInput = ref(null)
const actualCashInput = ref(null)
const amountTenderedInput = ref(null)
const searchBar = ref(null)

// 4. Computed Properties (Safe access)
const cashDifference = computed(() => Number(actualCash.value || 0) - (expectedCash.value || 0))
const subtotal = computed(() => (cart.value || []).reduce((acc, item) => acc + (Number(item.price) * Number(item.qty)), 0))
const total = computed(() => subtotal.value * (1 - (billDiscount.value / 100)))
const discountAmount = computed(() => subtotal.value * (billDiscount.value / 100))
const filteredProducts = computed(() => {
  const query = (searchQuery.value || '').toLowerCase()
  let result = products.value || []
  if (query) {
    result = result.filter(p => p.name.toLowerCase().includes(query))
  }
  return result.slice(0, 100)
})

// 5. Data Fetching Functions
const fetchCashierList = async () => {
   try {
     cashierList.value = await db.cashiers.toArray()
   } catch (e) {
     console.error("Cashier sync error", e)
   }
}


const searchSale = async () => {
   if(!returnSearchQuery.value) return;
   returnSearchAttempted.value = true;
   try {
     const saleId = parseInt(returnSearchQuery.value)
     if(isNaN(saleId)) {
        foundSale.value = null; return;
     }
     const sale = await db.sales.get(saleId)
     foundSale.value = sale || null;
   } catch (err) {
     console.error(err)
     foundSale.value = null;
   }
}

const closeReturnPopup = () => {
   showReturnPopup.value = false;
   returnSearchQuery.value = '';
   foundSale.value = null;
   returnSearchAttempted.value = false;
}

const confirmReturn = async () => {
  if (!foundSale.value) return;
  if (!confirm("Are you sure you want to process a full return? Inventory will be restocked and shift totals reduced.")) return;

  try {
    // 1. Restock items
    for (const item of foundSale.value.items) {
      if (item.id) {
        const prod = await db.pos_products.get(item.id)
        if (prod) {
          await db.pos_products.update(item.id, { 
            stock: (Number(prod.stock) || 0) + Number(item.qty) 
          })
        }
      }
    }

    // 2. Adjust shift totals
    if (foundSale.value.method === 'Cash') shiftTotals.value.cash -= foundSale.value.total
    if (foundSale.value.method === 'Card') shiftTotals.value.card -= foundSale.value.total

    // 3. Keep record in the returns table
    await db.returns.add({
      saleId: foundSale.value.id,
      date: new Date().toISOString(),
      total: foundSale.value.total,
      cashier: cashierName.value
    })

    // 4. Optionally delete or mark the sale as returned? 
    // We'll keep it but 'returns' table accounts for it in analytics.

    alert("Return processed successfully!")
    closeReturnPopup()
    fetchProducts() // refresh stock in view
  } catch (error) {
    alert("Error processing return: " + error.message)
  }
}


const fetchProducts = async () => {
  try {
    products.value = await db.pos_products.toArray()
  } catch (error) {
    console.error("Error fetching products", error)
  }
}

onMounted(() => {
  fetchProducts()
  fetchCashierList()

  watch(() => isClosingRegister.value, (val) => { 
    if (val) reinforcedFocus(actualCashInput)
  })
  
  watch(() => showPaymentPopup.value, (val) => { 
    if (val && paymentMethod.value === 'Cash') {
      reinforcedFocus(amountTenderedInput)
    }
  })
  
  watch(() => isRegisterOpen.value, (val) => { 
    if (!val) {
      reinforcedFocus(openingBalanceInput, 500)
      // Guard against focus loss on slow hardware (i3 4th gen)
      if (openingWatchdog) clearInterval(openingWatchdog)
      openingWatchdog = setInterval(() => {
        if (!isRegisterOpen.value && openingBalanceInput.value && document.activeElement !== openingBalanceInput.value) {
           reinforcedFocus(openingBalanceInput, 50)
        }
      }, 1500)
    } else {
      if (openingWatchdog) {
        clearInterval(openingWatchdog)
        openingWatchdog = null
      }
    }
  }, { immediate: true })

  // AUTO-FOCUS SEARCH BAR FOR NEXT CUSTOMER
  reinforcedFocus(searchBar, 400)
})

const handleGlobalKeydown = (e) => {
    // 1. CRITICAL: Ignore all global shortcuts if the user is currently typing in ANY input field

    const active = document.activeElement
    const isTypingField = active && (
      active.tagName === 'INPUT' || 
      active.tagName === 'TEXTAREA' || 
      active.isContentEditable
    )
    
    // Exception: Allow F1 to escape an input and Reset focus
    if (e.key === 'F1') {
      e.preventDefault()
      if (isTypingField) active.blur()
      mode.value = 'qty'
      qtyInputBuffer.value = ''
      selectedCartIndex.value = null
      reinforcedFocus(searchBar, 50)
      return
    }

    // Exception: Allow Alt key to trigger an Emergency Focus Refresh
    if (e.key === 'Alt') {
      e.preventDefault()
      console.log('[FocusDebug] Emergency Focus Triggered (ALT key)')
      // Find the most logical input (search bar or modal input)
      const el = document.querySelector('input:not([type="hidden"]):not([disabled]):not([readonly])')
      if (el) reinforcedFocus({ value: el }, 50)
      return
    }

    if (isTypingField) return

    // 2. QUANTITY ADJUSTMENT SHORTCUTS (Only when not typing)
    if (selectedCartIndex.value !== null) {
        if (e.key === 'Enter') {
           e.preventDefault();
           incrementQty(selectedCartIndex.value);
           return;
        }
        if (e.key === 'Backspace') {
           e.preventDefault();
           decrementQty(selectedCartIndex.value);
           return;
        }
    }

    // 3. RECEIPT PREVIEW SHORTCUTS
    if (showReceipt.value) {
       if (e.key === 'Enter') { e.preventDefault(); printBill(); return; }
       if (e.key === 'Escape') { e.preventDefault(); finishSale(); return; }
    }

    // 4. PAYMENT POPUP SHORTCUTS
    if (showPaymentPopup.value) {
       if (e.key === 'Enter') { e.preventDefault(); handlePayment(); return; }
       if (e.key === 'Escape') { e.preventDefault(); showPaymentPopup.value = false; return; }
    }

    if (!isRegisterOpen.value || isClosingRegister.value || showPaymentPopup.value) return

    // 5. OPEN PAYMENT SCREEN (Enter when cart has items and search is empty)
    if (e.key === 'Enter' && cart.value.length > 0) {
       e.preventDefault()
       paymentMethod.value = 'Cash' // Default to Cash for speed
       preparePayment()
       return
    }

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      handleQtyKeyboardInput(e.key)
      return
    }

    if (e.key === '%') {
      e.preventDefault()
      mode.value = mode.value === 'disc' ? 'qty' : 'disc' // Toggle
      qtyInputBuffer.value = ''
      selectedCartIndex.value = null
      return
    }
  }

  window.addEventListener('keydown', handleGlobalKeydown)
  
  // REINFORCE WINDOW FOCUS (Brings back cursor when switching back to app)
  const handleWindowFocus = () => {
     if (showPaymentPopup.value || isClosingRegister.value || showReturnPopup.value) return;
     reinforcedFocus(searchBar, 100);
  };
  window.addEventListener('focus', handleWindowFocus);

  onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeydown)
    window.removeEventListener('focus', handleWindowFocus);
    if (qtyBufferTimeout) clearTimeout(qtyBufferTimeout)
    if (openingWatchdog) clearInterval(openingWatchdog)
    if (bagToastTimer) clearTimeout(bagToastTimer)
  })

const handleQtyKeyboardInput = (num) => {
  if (mode.value === 'disc') {
     if (qtyBufferTimeout) clearTimeout(qtyBufferTimeout)
     qtyBufferTimeout = setTimeout(() => { qtyInputBuffer.value = '' }, 800)
     
     qtyInputBuffer.value += num
     const newDisc = parseInt(qtyInputBuffer.value)
     if (!isNaN(newDisc)) billDiscount.value = Math.min(newDisc, 100)
     return
  }
  if (selectedCartIndex.value === null || !cart.value[selectedCartIndex.value]) return

  if (qtyBufferTimeout) clearTimeout(qtyBufferTimeout)
  qtyBufferTimeout = setTimeout(() => {
    qtyInputBuffer.value = ''
  }, 800)

  qtyInputBuffer.value += num
  const newQty = parseInt(qtyInputBuffer.value)
  const itemToUpdate = cart.value[selectedCartIndex.value]

  if (!isNaN(newQty) && newQty >= 0) {
    itemToUpdate.qty = newQty
  }
}

const openRegister = () => {
  if (cashierName.value && openBalance.value >= 0) {
    openRegisterShift(cashierName.value, openBalance.value)
  }
}

const closeRegister = async () => {
  try {
    const shiftData = {
      cashier: cashierName.value,
      openBalance: openBalance.value,
      totalCashSales: shiftTotals.value.cash,
      totalCardSales: shiftTotals.value.card,
      totalSales: shiftTotals.value.cash + shiftTotals.value.card,
      expectedCash: expectedCash.value,
      actualCash: Number(actualCash.value),
      difference: cashDifference.value,
      closedAt: new Date().toISOString()
    }
    
    await db.shifts.add(shiftData)
    alert(`Register closed successfully by ${cashierName.value}.\n\nExpected: Rs ${Number(expectedCash.value || 0).toFixed(2)}\nActual: Rs ${Number(actualCash.value || 0).toFixed(2)}\nDifference: Rs ${Number(cashDifference.value || 0).toFixed(2)}`)
    
    closeRegisterShift()
    isClosingRegister.value = false
    actualCash.value = 0
  } catch (error) {
    alert("Error closing register and saving: " + error.message)
  }
}

const logout = async () => {
  try {
    router.push('/')
  } catch (error) {
    console.error("Logout error", error)
  }
}

const addToCart = (prod) => {
    // 1. CLEAR & EJECT SEARCH FOCUS
    searchQuery.value = ''
    preventRestoreOnce()
    
    // Perform a hard blur across all input elements to ensure global keydown captures the next keys
    const blurAll = () => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        if (searchBar.value) { searchBar.value.value = ''; searchBar.value.blur(); }
    };
    blurAll();
    setTimeout(blurAll, 10); // Run a second time after event loop to ensure it sticks during typing

  const existingIndex = cart.value.findIndex(i => i.id === prod.id)
  
  const hasStockCheck = prod.stock !== null && prod.stock !== undefined && prod.stock !== ''

  if (existingIndex > -1) {
    cart.value[existingIndex].qty++
    selectedCartIndex.value = existingIndex
  } else {
    cart.value.push({ ...prod, qty: 1 })
    selectedCartIndex.value = cart.value.length - 1
  }

  const addedItem = cart.value[selectedCartIndex.value]
  bagToast.value = {
    visible: true,
    name: prod.name,
    qty: addedItem?.qty || 1
  }
  if (bagToastTimer) clearTimeout(bagToastTimer)
  bagToastTimer = setTimeout(() => {
    bagToast.value.visible = false
  }, 1200)
  
  // Reset buffer whenever a product is selected/added
  qtyInputBuffer.value = ''
}

const removeFromCart = (index) => {
  cart.value.splice(index, 1)
  if (selectedCartIndex.value === index) selectedCartIndex.value = null
  else if (selectedCartIndex.value > index) selectedCartIndex.value--
}

const handleSearchKeydown = (e) => {
  // If we have a selected item and user types a number, REDIRECT to cart qty
  const isDigit = e.key >= '0' && e.key <= '9';
  if (isDigit && selectedCartIndex.value !== null) {
     e.preventDefault();
     handleNum(e.key);
     searchQuery.value = ''; // Ensure bar stays clean
     return;
  }
}

const incrementQty = (index) => {
  cart.value[index].qty++
}

const decrementQty = (index) => {
  if (cart.value[index].qty > 1) {
    cart.value[index].qty--
  } else {
    removeFromCart(index)
  }
}

const getCartQty = (id) => {
  const item = cart.value.find(i => i.id === id)
  return item ? item.qty : 0
}

const handleNum = (n) => {
  handleQtyKeyboardInput(n)
}

const handleDelete = () => {
  if (mode.value === 'disc') {
    billDiscount.value = 0
    qtyInputBuffer.value = ''
    mode.value = 'qty' // Switch back to qty after clearing
    return
  }
  if (selectedCartIndex.value !== null) {
      decrementQty(selectedCartIndex.value)
  }
}


const preparePayment = () => {
  if (!paymentMethod.value || cart.value.length === 0) return
  amountTendered.value = paymentMethod.value === 'Card' ? total.value : null
  showPaymentPopup.value = true
  
  // AGGRESSIVE AUTO-FOCUS FOR TENDER BOX (CASH)
  if (paymentMethod.value === 'Cash') {
     reinforcedFocus(amountTenderedInput)
     // Select the text after a slight delay so they can overwrite easily
     setTimeout(() => {
        amountTenderedInput.value?.select()
     }, 400)
  }
}

const handlePayment = async () => {
  if (!paymentMethod.value || cart.value.length === 0) return
  
  // FIXED: Dexie/IndexedDB cannot save Vue Proxies directly. Deep clone to plain JS objects.
  const cleanedItems = JSON.parse(JSON.stringify(cart.value))
  
  const saleData = {
    items: cleanedItems,
    subtotal: subtotal.value,
    discountPercent: billDiscount.value,
    discountAmount: discountAmount.value,
    total: total.value,
    method: paymentMethod.value,
    cashier: cashierName.value,
    date: new Date().toISOString(),
    saleType: saleType.value
  }
  
  try {
    const id = await db.sales.add(saleData)
    
    // Decrement Stock
    for (const item of cart.value) {
      if (item.id) {
        const prod = await db.pos_products.get(item.id)
        if (prod) {
          await db.pos_products.update(item.id, { 
            stock: (Number(prod.stock) || 0) - Number(item.qty) 
          })
        }
      }
    }

    // Update Shift Totals locally
    if(paymentMethod.value === 'Cash') shiftTotals.value.cash = (Number(shiftTotals.value.cash) || 0) + Number(total.value)
    if(paymentMethod.value === 'Card') shiftTotals.value.card = (Number(shiftTotals.value.card) || 0) + Number(total.value)
    shiftTotals.value.discounts = (Number(shiftTotals.value.discounts) || 0) + Number(discountAmount.value)

    // Prepare Receipt
    lastReceipt.value = {
      id: `INV-${id.toString().slice(-4).toUpperCase()}`,
      items: cleanedItems,
      subtotal: subtotal.value,
      discountAmount: discountAmount.value,
      discountPercent: billDiscount.value,
      total: total.value,
      method: paymentMethod.value,
      date: saleData.date,
      cashier: cashierName.value,
      tendered: Number(amountTendered.value),
      change: Number(amountTendered.value) - total.value
    }
    showPaymentPopup.value = false
    showReceipt.value = true
  } catch (error) {
    console.error("Sale Error:", error)
    alert("Error completing sale: " + error.message)
    // If it's a critical database error, suggest refresh
    if(error.name === 'DataCloneError') window.location.reload()
  }
}



const finishSale = () => {
  cart.value = []
  billDiscount.value = 0
  selectedCartIndex.value = null
  paymentMethod.value = null
  showReceipt.value = false
  lastReceipt.value = null
  amountTendered.value = 0
  
  // RESET MODE TO QTY FOR NEXT CUSTOMER
  mode.value = 'qty'
  
  // AUTO-FOCUS SEARCH BAR FOR NEXT CUSTOMER
  reinforcedFocus(searchBar, 400)
}

const printBill = () => {
  if (!lastReceipt.value) return;

  const logoHtml = systemSettings.value.logo 
    ? `<img src="${systemSettings.value.logo}" class="receipt-logo" />` 
    : '';
    
  const brandName = systemSettings.value.systemName || 'POS System';
  const displayDate = lastReceipt.value.date ? new Date(lastReceipt.value.date).toLocaleString() : new Date().toLocaleString();
  const cashier = lastReceipt.value.cashier || cashierName.value || 'Admin';

  let itemsHtml = '';
  lastReceipt.value.items.forEach(item => {
    itemsHtml += `
      <tr>
        <td class="left-align item-name-col">${item.name}</td>
        <td class="center-align">${item.qty}</td>
        <td class="right-align">${(item.price * item.qty).toFixed(2)}</td>
      </tr>
    `;
  });

  const printHtml = `
    <html>
      <head>
        <title>Print Receipt</title>
        <style>
          @page { margin: 0; size: 58mm auto; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            margin: 0; 
            padding: 0; 
            color: #000; 
            background: #fff; 
            font-weight: 800;
          }
          .receipt-wrapper {
            width: 45mm; /* Aggressively narrow to fix right-side clipping */
            margin: 0;
            padding: 2mm 0mm 4mm 0mm; /* Removed left margin to shift everything left */
            box-sizing: border-box;
            font-size: 9px;
            line-height: 1.1;
          }
          .receipt-logo { max-width: 100px; height: auto; display: block; margin: 0 auto 8px auto; filter: grayscale(100%) contrast(1.5); }
          .receipt-brand { text-align: center; font-size: 16px; margin: 0 0 4px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
          .receipt-address { text-align: center; font-size: 10px; margin: 0; font-weight: 800; line-height: 1.2; }
          .receipt-phone { text-align: center; font-size: 10px; margin: 2px 0 8px 0; font-weight: 800; }
          
          table { width: 100%; border-collapse: collapse; }
          .left-align { text-align: left; padding-right: 4px; }
          .right-align { text-align: right; }
          .center-align { text-align: center; }
          
          .meta-table td { font-size: 10px; padding: 1px 0; font-weight: 800; white-space: nowrap; }
          .meta-val { width: 100%; text-align: right; padding-left: 5px; white-space: normal; }
          
          .receipt-divider { border-top: 1.5px solid #000; margin: 8px 0; width: 100%; }
          .dash-divider { border-top: 1.2px dashed #000; margin: 6px 0; width: 100%; }
          
          .receipt-table th { font-size: 10px; padding: 4px 0; border-bottom: 1.5px solid #000; text-transform: uppercase; font-weight: 900; }
          .receipt-table td { font-size: 10px; padding: 6px 0; vertical-align: top; font-weight: 800; }
          .item-name-col { padding-right: 4px; word-break: break-word; }
          
          .totals-table td { font-size: 11px; padding: 3px 0; font-weight: 800; }
          .total-row td { font-size: 16px; font-weight: 900; padding-top: 8px; border-top: 1.5px solid #000; }
          
          .receipt-footer { text-align: center; margin-top: 20px; font-size: 10px; }
          .greeting { font-weight: 900; font-size: 13px; margin-bottom: 4px; }
          .brand-footer { font-weight: 900; font-size: 9px; margin-top: 8px; opacity: 0.8; }
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          ${logoHtml}
          <div class="receipt-brand">${brandName}</div>
          <div class="receipt-address">${systemSettings.value.address || ''}</div>
          <div class="receipt-phone">Tel: ${systemSettings.value.phone || ''}</div>
          
          <table class="meta-table">
            <tr><td>Date:</td><td class="meta-val">${displayDate}</td></tr>
            <tr><td>Bill No:</td><td class="meta-val">#${lastReceipt.value.id}</td></tr>
            <tr><td>Cashier:</td><td class="meta-val">${cashier}</td></tr>
          </table>
          
          <div class="receipt-divider"></div>
          
          <table class="receipt-table">
            <thead>
              <tr>
                <th class="left-align" style="width: 55%;">Item</th>
                <th class="center-align" style="width: 15%;">Qty</th>
                <th class="right-align" style="width: 30%;">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="receipt-divider"></div>
          
          <table class="totals-table">
            ${lastReceipt.value.discountAmount > 0 ? `
            <tr>
              <td class="left-align" style="font-size: 11px;">SUBTOTAL:</td>
              <td class="right-align" style="font-size: 11px;">${lastReceipt.value.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="left-align" style="font-size: 11px;">DISCOUNT (${lastReceipt.value.discountPercent}%):</td>
              <td class="right-align" style="font-size: 11px;">- ${lastReceipt.value.discountAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
            
            <tr class="total-row">
              <td class="left-align">NET TOTAL:</td>
              <td class="right-align">
                ${lastReceipt.value.total.toFixed(2)}
              </td>
            </tr>
            
            <tr><td colspan="2"><div class="dash-divider"></div></td></tr>
            
            <tr>
              <td class="left-align">PAID VIA:</td>
              <td class="right-align">${lastReceipt.value.method.toUpperCase()}</td>
            </tr>
            <tr>
              <td class="left-align">CASH RECEIVED:</td>
              <td class="right-align">${(lastReceipt.value.tendered || lastReceipt.value.total).toFixed(2)}</td>
            </tr>
            <tr>
              <td class="left-align">CHANGE GIVEN:</td>
              <td class="right-align" style="font-size: 15px;">${(lastReceipt.value.change || 0).toFixed(2)}</td>
            </tr>
          </table>
          
          <div class="receipt-divider"></div>
          
          <div class="receipt-footer">
            <div class="greeting">THANK YOU FOR VISITING!</div>
            <div class="greeting">PLEASE COME AGAIN</div>
            
            <div class="brand-footer">Software by Sithurasa</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '', 'width=400,height=600');
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.focus();
  
  // Need to wait slightly for logo base64 image decoding logic across some Chromium versions
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 400);
}


</script>

<style scoped>
.pos-container { height: 100vh; display: flex; flex-direction: column; background-color: #f8f9fa; }
.pos-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; background: white; border-bottom: 1px solid #dee2e6; }
.header-left { display: flex; align-items: center; gap: 20px; }
.nav-back { color: #444; font-size: 20px; text-decoration: none; }
.user-info-simple { display: flex; align-items: center; gap: 10px; }
.user-avatar-simple { width: 32px; height: 32px; background: #8c2a3d; color: white; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold; }
.brand-name { font-weight: 600; font-size: 18px; color: #333; }

.btn-return {
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 15px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
  pointer-events: auto;
}
.btn-return:hover {
  background: #5a6268;
}
.sale-type-select { padding: 8px 15px; border-radius: 20px; border: 1px solid #714b67; color: #714b67; font-weight: 600; cursor: pointer; background: white; }
.search-bar { position: relative; width: 250px;}
.search-bar input { width: 100%; padding: 8px 15px 8px 35px; border-radius: 5px; border: 1px solid #ddd; pointer-events: auto;}
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #888; }
.pos-main { flex-grow: 1; display: flex; overflow: hidden; }
.pos-left { width: 350px; display: flex; flex-direction: column; background: white; border-right: 1px solid #dee2e6; z-index: 10;}
.pos-right { flex-grow: 1; padding: 15px; background: #f4f5f7; overflow-y: auto; z-index: 5;}
.cart-header { padding: 15px; border-bottom: 1px solid #eee; background: #fafafa; }
.btn-clear-all { background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.2s; }
.btn-clear-all:hover { background: #fca5a5; color: white; }
.cart-title { font-weight: bold; color: #666; text-transform: uppercase; font-size: 12px; }
.cart-items { flex-grow: 1; padding: 10px; overflow-y: auto;}
.cart-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #f1f3f5; transition: all 0.2s; cursor: pointer; border-left: 4px solid transparent; }
.cart-item:hover { background: #f8f9fa; }
.cart-item.selected { background: #e3f2fd; border-left-color: #2196f3; box-shadow: inset 2px 0 5px rgba(33, 150, 243, 0.1); }
.item-info { display: flex; flex-direction: column; gap: 4px; }
.item-controls { display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 4px 8px; border-radius: 20px; border: 1px solid #e2e8f0; }
.item-qty { font-weight: 800; color: #8c2a3d; min-width: 20px; text-align: center; font-size: 14px; }
.btn-qty-plus, .btn-qty-minus { background: white; border: 1px solid #e2e8f0; color: #475569; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 10px; }
.btn-qty-plus:hover { background: #8c2a3d; color: white; border-color: #8c2a3d; }
.btn-qty-minus:hover { background: #ef4444; color: white; border-color: #ef4444; }
.item-name { font-weight: 700; color: #1e293b; font-size: 14px; }
.item-actions { display: flex; align-items: center; gap: 15px; }
.item-price { font-weight: 800; color: #1e293b; }
.btn-remove-item { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 15px; transition: color 0.2s; padding: 5px; }
.btn-remove-item:hover { color: #ef4444; }
.empty-cart { padding: 40px; text-align: center; color: #bbb; font-style: italic; }
.cart-footer { padding: 15px; border-top: 1px solid #dee2e6;}
.total-row { display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-bottom: 15px; }
.pos-keypad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #ddd; }
.keypad-btn { background: white; border: none; padding: 20px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; pointer-events: auto;}
.keypad-btn:hover { background: #f0f0f0; }
.keypad-btn.action { background: #e1f5fe; }
.keypad-btn.action.active { background: #0288d1; color: white; font-weight: bold; }
.keypad-btn.action[data-mode="disc"] { background: #fff3e0; color: #e65100; }
.keypad-btn.action[data-mode="disc"].active { background: #ef6c00; color: white; }
.payment-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 15px; }
.payment-btn { padding: 12px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 5px; pointer-events: auto; transition: all 0.2s; }
.payment-btn:hover { background: #f8f9fa; transform: translateY(-2px); border-color: #714b67; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.payment-btn.selected { background: #714b67; color: white; border-color: #714b67; box-shadow: 0 4px 8px rgba(113, 75, 103, 0.3); }
.btn-complete-payment { background: #2e7d32; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 16px; cursor: pointer; pointer-events: auto; grid-column: span 3; margin-top: 5px; height: 50px;}
.btn-complete-payment:disabled { background: #ccc; cursor: not-allowed; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 15px; }
.product-card { background: white; padding: 20px; border-radius: 5px; cursor: pointer; position: relative; border-bottom: 3px solid transparent; box-shadow: 0 2px 4px rgba(0,0,0,0.05); pointer-events: auto;}
.product-card:hover { border-bottom-color: #f48fb1; }
.product-name { font-weight: 600; margin-bottom: 5px; }
.product-price { color: #714b67; font-weight: bold; font-size: 14px; }
.product-qty-badge { position: absolute; top: 10px; right: 10px; background: #714b67; color: white; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.product-inventory-info { font-size: 11px; color: #ef4444; font-weight: 700; margin-top: 4px; background: #fef2f2; display: inline-block; padding: 2px 5px; border-radius: 4px; }
.product-inventory-info.red { color: white; background: #ef4444; }
.delete-key { background-color: #ffcdd2 !important; grid-column: span 2; }
.delete-key:hover { background-color: #ef9a9a !important; }
.bag-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 12000;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: min(360px, calc(100vw - 32px));
  padding: 14px 16px;
  background: #111827;
  color: white;
  border-radius: 8px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.32);
  pointer-events: none;
}
.bag-toast-icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #22c55e;
  color: white;
}
.bag-toast-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}
.bag-toast-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}
.bag-toast-copy span {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.bag-toast-qty {
  min-width: 34px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-weight: 800;
  text-align: center;
}
.bag-toast-enter-active,
.bag-toast-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.bag-toast-enter-from,
.bag-toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
.modal-content { background: white; padding: 30px; border-radius: 12px; width: 100%; max-width: 400px; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); pointer-events: auto; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
.form-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px; pointer-events: auto; }
.modal-actions { display: flex; gap: 10px; }
.btn-cancel { flex: 1; padding: 12px; background: #e0e0e0; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; pointer-events: auto;}
.btn-save { flex: 1; padding: 12px; background: #2e7d32; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; pointer-events: auto;}
.summary-details p { margin: 5px 0; font-size: 16px; }

/* 58mm Printer Formats */
.receipt-printout { font-family: 'Courier New', Courier, monospace; font-size: 9px; color: #000; background: white; padding: 2mm 0mm 4mm 0mm; width: 100%; max-width: 45mm; margin: 0 auto; line-height: 1.1; box-sizing: border-box; }
.receipt-logo { max-width: 40px; max-height: 40px; display: block; margin: 0 auto 5px auto; object-fit: contain; filter: grayscale(100%); }
.receipt-header { text-align: center; margin-bottom: 5px; }
.receipt-brand { margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; }
.receipt-address { margin: 2px 0 5px 0; font-size: 10px; }
.receipt-meta { text-align: left; font-size: 10px; margin: 5px 0; display: flex; flex-direction: column; gap: 2px; }
.receipt-meta p { display: flex; justify-content: space-between; margin: 0; }

.receipt-divider { border: 0; border-top: 1px dashed #000; margin: 5px 0; }

.receipt-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.receipt-table th { padding: 3px 0; border-bottom: 1px dashed #000; font-weight: bold; font-size: 10px; }
.receipt-table td { padding: 4px 0; font-size: 11px; vertical-align: top; }
.item-name-col { word-wrap: break-word; overflow-wrap: break-word; }

.receipt-totals { text-align: right; margin: 5px 0; font-size: 11px; }
.total-line { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin: 5px 0; line-height: 1; align-items: center;}
.total-bold { font-size: 14px; }
.payment-line { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;}

.receipt-footer { text-align: center; margin-top: 10px; font-size: 11px; }
.greeting { font-weight: bold; margin: 0 0 2px 0; }
.sub-greeting { margin: 0; font-size: 10px; }

@media print {
  body * { visibility: hidden; }
  #printSection, #printSection * { visibility: visible; }
  #printSection { position: absolute; left: 0; top: 0; width: 45mm !important; max-width: 45mm !important; margin: 0; padding: 0; color: black !important; box-sizing: border-box; }
}
</style>
