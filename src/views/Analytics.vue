<template>
  <div class="pos-container">
    <header class="pos-header">
      <div class="header-left">
        <!-- If in a sub-report, back button goes to Dashboard Analytics. If in Analytics, back to Main Menu. -->
        <button v-if="activeView !== 'dashboard'" @click="activeView = 'dashboard'" class="nav-back-btn">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <router-link v-else to="/dashboard" class="nav-back-btn">
          <i class="fa-solid fa-arrow-left"></i>
        </router-link>
        
        <div class="user-info-simple">
          <img v-if="systemSettings.logo" :src="systemSettings.logo" alt="Logo" class="user-avatar-simple" style="object-fit: contain;">
          <div v-else class="user-avatar-simple">S</div>
          <span class="brand-name">
             {{ activeView === 'dashboard' ? (systemSettings.systemName || 'POS') + ' Analytics' : viewTitle }}
          </span>
        </div>
      </div>
      <div class="header-right" style="display:flex; gap:10px;">
        <button @click="exportCurrentView" class="btn-export excel" :disabled="loading">
          <i class="fa-solid fa-file-excel"></i> Export Excel
        </button>
        <button @click="logout" class="btn-logout" title="Logout">
          <i class="fa-solid fa-power-off"></i> Logout
        </button>
      </div>
    </header>

    <main class="pos-main">
      <div class="analytics-content">
        <!-- Shared Filter Bar -->
        <div class="filter-card">
           <div class="filter-group">
            <label>Report Type</label>
             <select v-model="reportType" @change="loadAllData">
                <option value="daily">Daily Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="yearly">Yearly Report</option>
                <option value="custom">Custom Range</option>
             </select>
           </div>
           
           <div class="filter-group" v-if="reportType === 'daily'">
              <label>Select Date</label>
              <input type="date" v-model="selectedDate" @change="loadAllData">
           </div>
           <div class="filter-group" v-if="reportType === 'monthly'">
              <label>Select Month</label>
              <input type="month" v-model="selectedMonth" @change="loadAllData">
           </div>
           <div class="filter-group" v-if="reportType === 'yearly'">
              <label>Select Year</label>
              <input type="number" v-model="selectedYear" @change="loadAllData">
           </div>
           <div class="filter-group" v-if="reportType === 'custom'" style="display:flex; gap:10px;">
              <div><label>From</label><input type="date" v-model="customStart" @change="loadAllData"></div>
              <div><label>To</label><input type="date" v-model="customEnd" @change="loadAllData"></div>
           </div>
        </div>

        <div v-if="loading" class="load-state">
           <div class="spinner"></div>
           <p>Analyzing system data...</p>
        </div>

        <div v-else>
          <!-- VIEW 1: MAIN DASHBOARD -->
          <div v-if="activeView === 'dashboard'">
            <h2 class="page-title">{{ reportTitle }}</h2>
            
            <div class="metrics-grid">
              <div class="metric-card clickable" @click="activeView = 'sales'">
                <div class="metric-icon" style="background: #e3f2fd; color: #1976d1;"><i class="fa-solid fa-chart-line"></i></div>
                <div class="metric-details">
                  <span class="metric-title">Gross Sales</span>
                  <span class="metric-value">Rs {{ grossSales.toFixed(2) }}</span>
                </div>
                <i class="fa-solid fa-chevron-right arrow-indicator"></i>
              </div>

              <div class="metric-card clickable" @click="activeView = 'returns'">
                <div class="metric-icon" style="background: #fff1f2; color: #e11d48;"><i class="fa-solid fa-rotate-left"></i></div>
                <div class="metric-details">
                  <span class="metric-title">Total Returns</span>
                  <span class="metric-value">- Rs {{ totalReturns.toFixed(2) }}</span>
                </div>
                <i class="fa-solid fa-chevron-right arrow-indicator"></i>
              </div>

              <div class="metric-card clickable" @click="activeView = 'shifts'">
                <div class="metric-icon" style="background: #e8f5e9; color: #2e7d32;"><i class="fa-solid fa-cash-register"></i></div>
                <div class="metric-details">
                  <span class="metric-title">Shift Reconciliation</span>
                  <span class="metric-value">{{ shiftsList.length }} Shifts</span>
                </div>
                <i class="fa-solid fa-chevron-right arrow-indicator"></i>
              </div>

              <div class="metric-card">
                <div class="metric-icon" style="background: #fdf2f2; color: #ef4444;"><i class="fa-solid fa-tag"></i></div>
                <div class="metric-details">
                  <span class="metric-title">Total Discounts</span>
                  <span class="metric-value">Rs {{ totalDiscounts.toFixed(2) }}</span>
                </div>
              </div>
            </div>

            <!-- Dashboard Mini Tables -->
            <div class="summary-tables-container">
              <div @click="activeView = 'sales'" class="summary-table-section interactive-section">
                <div class="section-header">
                   <h3>Recent Sales by Item</h3>
                   <span class="view-all-link">View Full Report <i class="fa-solid fa-arrow-right"></i></span>
                </div>
                <div class="table-container">
                  <table class="data-table">
                    <thead><tr><th class="left">Item</th><th class="center">Qty</th><th class="right">Rev (Rs)</th></tr></thead>
                    <tbody>
                      <tr v-for="i in topItems.slice(0, 5)" :key="i.name">
                        <td class="left">{{ i.name }}</td><td class="center">{{ i.qty }}</td><td class="right">{{ i.revenue.toFixed(2) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Navigation Buttons -->
            <div class="analytics-actions">
              <button class="nav-btn sales" @click="activeView = 'sales'">
                <div class="icon-box"><i class="fa-solid fa-boxes-stacked"></i></div>
                <div class="btn-info"><span class="btn-headline">Sales by Item (Full Report)</span><span class="btn-subtext">Itemized performance data</span></div>
                <i class="fa-solid fa-chevron-right arrow"></i>
              </button>

              <button class="nav-btn returns" @click="activeView = 'returns'">
                <div class="icon-box"><i class="fa-solid fa-clock-rotate-left"></i></div>
                <div class="btn-info"><span class="btn-headline">Returns Summary (Full Log)</span><span class="btn-subtext">Refunds and audit history</span></div>
                <i class="fa-solid fa-chevron-right arrow"></i>
              </button>

              <button class="nav-btn register" @click="activeView = 'shifts'">
                <div class="icon-box"><i class="fa-solid fa-cash-register"></i></div>
                <div class="btn-info"><span class="btn-headline">Shift & Cash Reconciliation</span><span class="btn-subtext">Review discrepancies & totals</span></div>
                <i class="fa-solid fa-chevron-right arrow"></i>
              </button>
            </div>
          </div>

          <!-- VIEW 2: FULL SALES REPORT (15 ROWS PAGINATION) -->
          <div v-else-if="activeView === 'sales'" class="fade-in">
             <div class="report-header">
                <h2>Product Sales Performance Audit</h2>
                <button @click="activeView = 'dashboard'" class="btn-close-view">Close Report <i class="fa-solid fa-xmark"></i></button>
             </div>
             <div class="table-container full-report">
                <table class="data-table">
                  <thead>
                    <tr><th class="left">Date</th><th class="left">Invoice #</th><th class="left">Item</th><th class="center">Qty</th><th class="right">Net (Rs)</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in paginatedSales" :key="item.id" :style="{ background: item.type === 'return' ? '#fff1f2' : '' }">
                      <td class="left small-txt">{{ new Date(item.date).toLocaleString([], {dateStyle:'short', timeStyle:'short'}) }}</td>
                      <td class="left bold-txt">#{{ item.invoiceId }}</td>
                      <td class="left" :style="{ textDecoration: item.type === 'return' ? 'line-through' : 'none', color: item.type === 'return' ? '#ef4444' : '' }">
                        {{ item.name }} <span v-if="item.type === 'return'">(Returned)</span>
                      </td>
                      <td class="center" :style="{ color: item.type === 'return' ? '#ef4444' : '' }">
                        {{ item.type === 'return' ? '-' : '' }}{{ item.qty }}
                      </td>
                      <td class="right bold-txt" :style="{ color: item.type === 'return' ? '#ef4444' : '#2e7d32' }">
                        {{ item.type === 'return' ? '-' : '' }}{{ item.net.toFixed(2) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
             </div>
             <!-- Pagination -->
             <div class="pagination-footer">
                <button class="page-btn" :disabled="salesPage === 1" @click="salesPage--">Prev</button>
                <div class="page-info">Page {{ salesPage }} of {{ Math.ceil(fullItemizedSales.length / 15) || 1 }}</div>
                <button class="page-btn" :disabled="salesPage * 15 >= fullItemizedSales.length" @click="salesPage++">Next</button>
             </div>
          </div>

          <!-- VIEW 3: FULL RETURNS LOG -->
          <div v-else-if="activeView === 'returns'" class="fade-in">
             <div class="report-header">
                <h2>Returns & Refund Logs</h2>
                <button @click="activeView = 'dashboard'" class="btn-close-view">Close Report <i class="fa-solid fa-xmark"></i></button>
             </div>
             <div class="table-container full-report">
                <table class="data-table">
                  <thead>
                    <tr><th class="left">Return Date</th><th class="left">Invoice Ref</th><th class="left">Cashier</th><th class="right">Refund (Rs)</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="ret in paginatedReturns" :key="ret.id">
                      <td class="left">{{ new Date(ret.date).toLocaleString() }}</td>
                      <td class="left">#{{ ret.saleId }}</td>
                      <td class="left">{{ ret.cashier }}</td>
                      <td class="right bold-txt" style="color:#dc3545;">- Rs. {{ ret.total.toFixed(2) }}</td>
                    </tr>
                  </tbody>
                </table>
             </div>
             <div class="pagination-footer">
                <button class="page-btn" :disabled="returnsPage === 1" @click="returnsPage--">Prev</button>
                <div class="page-info">Page {{ returnsPage }} of {{ Math.ceil(returnsList.length / 15) || 1 }}</div>
                <button class="page-btn" :disabled="returnsPage * 15 >= returnsList.length" @click="returnsPage++">Next</button>
             </div>
          </div>

          <!-- VIEW 4: FULL SHIFT REPORT -->
          <div v-else-if="activeView === 'shifts'" class="fade-in">
             <div class="report-header">
                <h2>Shift & Cash Audit History</h2>
                <button @click="activeView = 'dashboard'" class="btn-close-view">Close Report <i class="fa-solid fa-xmark"></i></button>
             </div>
             <div class="table-container full-report">
                <table class="data-table">
                  <thead>
                    <tr><th class="left">Date</th><th class="center">Cashier</th><th class="center">Cash Total</th><th class="center">Card Total</th><th class="right">Diff (Rs)</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="shift in paginatedShifts" :key="shift.id">
                      <td class="left">{{ new Date(shift.closedAt).toLocaleString() }}</td>
                      <td class="center">{{ shift.cashier }}</td>
                      <td class="center">{{ shift.totalCashSales.toFixed(2) }}</td>
                      <td class="center">{{ shift.totalCardSales.toFixed(2) }}</td>
                      <td class="right bold-txt" :style="{ color: shift.difference < 0 ? '#dc3545' : '#2e7d32' }">{{ shift.difference.toFixed(2) }}</td>
                    </tr>
                  </tbody>
                </table>
             </div>
             <div class="pagination-footer">
                <button class="page-btn" :disabled="shiftsPage === 1" @click="shiftsPage--">Prev</button>
                <div class="page-info">Page {{ shiftsPage }} of {{ Math.ceil(shiftsList.length / 15) || 1 }}</div>
                <button class="page-btn" :disabled="shiftsPage * 15 >= shiftsList.length" @click="shiftsPage++">Next</button>
             </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db'
import { systemSettings } from '../composables/useSettings'
import * as XLSX from 'xlsx';

const router = useRouter()
const activeView = ref('dashboard')
const loading = ref(true)

// Config Settings
const getLocalYMD = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const reportType = ref('daily')
const selectedDate = ref(getLocalYMD())
const selectedMonth = ref(getLocalYMD().substr(0,7))
const selectedYear = ref(new Date().getFullYear())
const customStart = ref(getLocalYMD())
const customEnd = ref(getLocalYMD())

// Data Stats
const grossSales = ref(0)
const totalDiscounts = ref(0)
const totalReturns = ref(0)
const netSales = ref(0)
const totalTransactions = ref(0)
const topItems = ref([])
const returnsList = ref([])
const shiftsList = ref([])
const fullItemizedSales = ref([])

// Pagination
const salesPage = ref(1)
const returnsPage = ref(1)
const shiftsPage = ref(1)

const paginatedSales = computed(() => fullItemizedSales.value.slice((salesPage.value-1)*15, salesPage.value*15))
const paginatedReturns = computed(() => returnsList.value.slice((returnsPage.value-1)*15, returnsPage.value*15))
const paginatedShifts = computed(() => shiftsList.value.slice((shiftsPage.value-1)*15, shiftsPage.value*15))

const viewTitle = computed(() => {
    if(activeView.value === 'sales') return "Full Sales Report"
    if(activeView.value === 'returns') return "Returns Log"
    if(activeView.value === 'shifts') return "Shift Audit History"
    return "Analytics"
})

const reportTitle = computed(() => {
  if (reportType.value === 'daily') return `Daily Audit: ${selectedDate.value}`
  if (reportType.value === 'monthly') return `Monthly Audit: ${selectedMonth.value}`
  if (reportType.value === 'yearly') return `Yearly Audit: ${selectedYear.value}`
  return `Range: ${customStart.value} to ${customEnd.value}`
})

const loadAllData = async () => {
  loading.value = true
  salesPage.value = 1; returnsPage.value = 1; shiftsPage.value = 1;
  try {
    // CALCULATE START AND END IN LOCAL TIME
    let start, end;
    if (reportType.value === 'daily') {
      const [y, m, d] = selectedDate.value.split('-').map(Number)
      start = new Date(y, m - 1, d, 0, 0, 0, 0)
      end = new Date(y, m - 1, d, 23, 59, 59, 999)
    } else if (reportType.value === 'monthly') {
      const [y, m] = selectedMonth.value.split('-').map(Number)
      start = new Date(y, m - 1, 1, 0, 0, 0, 0)
      end = new Date(y, m, 0, 23, 59, 59, 999)
    } else if (reportType.value === 'yearly') {
      const y = Number(selectedYear.value)
      start = new Date(y, 0, 1, 0, 0, 0, 0)
      end = new Date(y, 11, 31, 23, 59, 59, 999)
    } else {
      const [sy, sm, sd] = customStart.value.split('-').map(Number)
      const [ey, em, ed] = customEnd.value.split('-').map(Number)
      start = new Date(sy, sm - 1, sd, 0, 0, 0, 0)
      end = new Date(ey, em - 1, ed, 23, 59, 59, 999)
    }

    console.log(`[AnalyticsDebug] Fetching data range: ${start.toLocaleString()} TO ${end.toLocaleString()}`)

    // 1. Fetch Sales
    const sales = await db.sales.toArray()
    console.log(`[AnalyticsDebug] Total sales in DB: ${sales.length}`)
    
    let filteredSales = sales.filter(s => {
      const d = new Date(s.date); 
      return d >= start && d <= end
    })
    console.log(`[AnalyticsDebug] Filtered sales for this range: ${filteredSales.length}`)

    // Calculations
    let grossTotal = 0; let discTotal = 0; let transCount = 0;
    const itemMap = {}; const auditList = [];

    filteredSales.forEach(s => {
      transCount++;
      const billDisc = s.discountPercent || 0;
      s.items.forEach(i => {
        const iGross = Number(i.qty) * Number(i.price);
        const iDisc = iGross * (billDisc / 100);
        const iNet = iGross - iDisc;
        
        grossTotal += iGross; discTotal += iDisc;
        
        if(!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
        itemMap[i.name].qty += i.qty;
        itemMap[i.name].revenue += iNet;

        auditList.push({
           date: s.date,
           invoiceId: s.id && s.id.toString().includes('INV-') ? s.id : `INV-${s.id.toString().slice(-4).toUpperCase()}`,
           name: i.name, qty: i.qty, net: iNet
        });
      });
    });

    grossSales.value = grossTotal
    totalDiscounts.value = discTotal
    totalTransactions.value = transCount
    fullItemizedSales.value = auditList.sort((a,b) => new Date(b.date) - new Date(a.date))
    topItems.value = Object.values(itemMap).sort((a,b) => b.revenue - a.revenue)

    // 2. Returns
    const returns = await db.returns.toArray()
    let retSum = 0;
    returnsList.value = returns.filter(r => {
      const d = new Date(r.date); return d >= start && d <= end
    })
    
    // Add returned items to the main sales audit list so they appear with red lines
    for(const r of returnsList.value) {
       retSum += r.total;
       // We try to fetch the original sale to know WHAT items were returned
       const orig = await db.sales.get(r.saleId);
       if(orig && orig.items) {
          orig.items.forEach(ri => {
             const iGross = Number(ri.qty) * Number(ri.price);
             const iNet = iGross * (1 - (orig.discountPercent / 100));
             auditList.push({
                date: r.date,
                invoiceId: r.saleId && r.saleId.toString().includes('INV-') ? r.saleId : `INV-${r.saleId.toString().slice(-4).toUpperCase()}`,
                name: ri.name,
                qty: ri.qty,
                net: iNet,
                type: 'return',
                id: `ret-${r.id}-${ri.name}`
             });
          });
       } else {
          // If sale not found, just add a generic return row
          auditList.push({
             date: r.date,
             invoiceId: r.saleId ? `INV-${r.saleId.toString().slice(-4).toUpperCase()}` : 'N/A',
             name: 'Full Order Return',
             qty: 0,
             net: r.total,
             type: 'return',
             id: `ret-${r.id}`
          });
       }
    }

    totalReturns.value = retSum
    netSales.value = (grossTotal - discTotal - retSum)
    fullItemizedSales.value = auditList.sort((a,b) => new Date(b.date) - new Date(a.date))

    // 3. Shifts
    const shifts = await db.shifts.toArray()
    shiftsList.value = shifts.filter(s => {
      const d = new Date(s.closedAt); return d >= start && d <= end
    }).sort((a,b) => new Date(b.closedAt) - new Date(a.closedAt))

  } catch (err) { console.error(err) } finally { loading.value = false }
}

const logout = () => { sessionStorage.clear(); router.push('/') }

const exportCurrentView = () => {
   // Export appropriate table based on activeView
   let exportData = []
   let filename = "Report.xlsx"
   if(activeView.value === 'dashboard'){
      exportData = [{ "Metric": "Gross Sales", "Value": grossSales.value }, { "Metric": "Net Revenue", "Value": netSales.value }]
   } else if(activeView.value === 'sales'){
      exportData = fullItemizedSales.value.map(i => ({ "Date": i.date, "Invoice": i.invoiceId, "Item": i.name, "Qty": i.qty, "Net": i.net }))
   }
   const ws = XLSX.utils.json_to_sheet(exportData)
   const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
   XLSX.writeFile(wb, filename)
}

onMounted(loadAllData)
</script>

<style scoped>
.pos-container { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; font-family: 'Inter', sans-serif; }
.pos-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 25px; background: white; border-bottom: 2px solid #e2e8f0; }
.header-left { display: flex; align-items: center; gap: 15px; }
.nav-back-btn { background: none; border: none; color: #475569; font-size: 20px; cursor: pointer; padding: 8px; border-radius: 50%; }
.nav-back-btn:hover { background: #f1f5f9; color: #1e293b; }

.user-info-simple { display: flex; align-items: center; gap: 12px; }
.user-avatar-simple { width: 36px; height: 36px; background: #8c2a3d; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: bold; }
.brand-name { font-weight: 800; font-size: 19px; color: #1e293b; letter-spacing: -0.5px; }

.btn-export { padding: 10px 18px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
.btn-export.excel { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
.btn-logout { background: #fee2e2; color: #dc2626; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }

.pos-main { flex: 1; padding: 25px; overflow-y: auto; }
.analytics-content { max-width: 1200px; margin: 0 auto; width: 100%; }

.filter-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 25px; display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; border: 1px solid #e2e8f0; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
.filter-group select, .filter-group input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; min-width: 150px; }

.page-title { font-size: 22px; font-weight: 900; color: #0f172a; margin-bottom: 20px; }

.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 30px; }
.metric-card { background: white; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; border: 1px solid #e2e8f0; position: relative; }
.metric-card.clickable { cursor: pointer; transition: all 0.2s; }
.metric-card.clickable:hover { border-color: #3b82f6; box-shadow: 0 10px 15px -3px rgba(59,130,246,0.1); transform: translateY(-2px); }
.metric-icon { width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.metric-details { display: flex; flex-direction: column; }
.metric-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
.metric-value { font-size: 18px; font-weight: 800; color: #1e293b; }
.arrow-indicator { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: #e2e8f0; font-size: 12px; }

.summary-tables-container { display: flex; flex-direction: column; gap: 25px; }
.summary-table-section { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
.interactive-section { cursor: pointer; transition: 0.2s; }
.interactive-section:hover { border-color: #3b82f6; }
.section-header { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
.section-header h3 { margin: 0; font-size: 16px; font-weight: 800; color: #1e293b; }
.view-all-link { color: #3b82f6; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; }

.table-container { width: 100%; border-collapse: collapse; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { background: #f8fafc; padding: 12px 20px; font-size: 11px; color: #64748b; text-transform: uppercase; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 800; }
.data-table td { padding: 12px 20px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #334155; }
.loading-data { padding: 40px; text-align: center; color: #64748b; }

.analytics-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 30px; border-top: 2px solid #f1f5f9; padding-top: 30px; }
.nav-btn { background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; cursor: pointer; text-decoration: none; text-align: left; transition: all 0.2s; }
.nav-btn:hover { border-color: #3b82f6; background: #f0f7ff; transform: translateY(-2px); }
.icon-box { width: 48px; height: 48px; min-width: 48px; background: #f8fafc; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #3b82f6; }
.btn-info { flex: 1; }
.btn-headline { display: block; font-weight: 800; font-size: 15px; color: #1e293b; }
.btn-subtext { font-size: 12px; color: #64748b; }
.arrow { color: #cbd5e1; }

/* FULL REPORT VIEW STYLES */
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.report-header h2 { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
.btn-close-view { background: #f1f5f9; border: none; padding: 10px 15px; border-radius: 8px; font-weight: 700; color: #475569; cursor: pointer; }
.full-report .data-table td { padding: 16px 20px; font-size: 15px; }
.bold-txt { font-weight: 700; }
.small-txt { font-size: 12px; color: #64748b; }

.pagination-footer { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 30px; }
.page-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
.page-btn:disabled { background: #e2e8f0; cursor: not-allowed; color: #94a3b8; }
.page-info { font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 5px; }

.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.spinner { width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
