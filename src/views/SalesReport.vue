<template>
  <div class="pos-container">
    <header class="pos-header">
      <div class="header-left">
        <router-link to="/analytics" class="nav-back">
          <i class="fa-solid fa-arrow-left"></i>
        </router-link>
        <div class="user-info-simple">
          <div class="user-avatar-simple">S</div>
          <span class="brand-name">Sales By Item Report</span>
        </div>
      </div>
      <div class="header-right">
        <button @click="exportToExcel" class="btn-export">
          <i class="fa-solid fa-file-excel"></i> Export Excel
        </button>
      </div>
    </header>

    <main class="pos-main">
      <div class="report-content">
        <!-- Filtration -->
        <div class="filter-card">
          <div class="filter-group">
            <label>Range Type</label>
            <select v-model="reportType" @change="loadData">
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="filter-group" v-if="reportType === 'daily'">
            <label>Date</label>
            <input type="date" v-model="selectedDate" @change="loadData">
          </div>
          <div class="filter-group" v-if="reportType === 'monthly'">
            <label>Month</label>
            <input type="month" v-model="selectedMonth" @change="loadData">
          </div>
          <div class="filter-group" v-if="reportType === 'yearly'">
            <label>Year</label>
            <input type="number" v-model="selectedYear" @change="loadData">
          </div>
          <div class="filter-group" v-if="reportType === 'custom'" style="display:flex; gap:10px;">
            <div class="sub-group">
              <label>From</label>
              <input type="date" v-model="customStart" @change="loadData">
            </div>
            <div class="sub-group">
              <label>To</label>
              <input type="date" v-model="customEnd" @change="loadData">
            </div>
          </div>
        </div>

        <h2 class="report-title">{{ reportTitle }}</h2>

        <div v-if="loading" class="load-state">Analyzing sales data...</div>
        <div v-else>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Invoice #</th>
                  <th style="text-align: left;">Item Name</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Gross (Rs)</th>
                  <th style="text-align: right;">Disc (Rs)</th>
                  <th style="text-align: right;">Net (Rs)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in paginatedItems" :key="index" :style="{ background: item.type === 'Return' ? '#fff1f2' : '' }">
                  <td style="text-align: left; font-weight: 700; color: #64748b;">#{{ item.invoiceId }}</td>
                  <td style="text-align: left; font-weight: 600;">{{ item.name }}</td>
                  <td style="text-align: center;">{{ item.qty }}</td>
                  <td style="text-align: right; color: #64748b;">{{ item.gross.toFixed(2) }}</td>
                  <td style="text-align: right; color: #ef4444;">-{{ item.discount.toFixed(2) }}</td>
                  <td style="text-align: right; color: #2e7d32; font-weight: bold;">{{ item.net.toFixed(2) }}</td>
                </tr>
                <tr v-if="items.length === 0">
                  <td colspan="6" class="no-data">No sales found for this period.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Controls -->
          <div v-if="items.length > itemsPerPage" class="pagination-footer">
            <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
              <i class="fa-solid fa-chevron-left"></i> Previous
            </button>
            <div class="page-info">
              Page <span>{{ currentPage }}</span> of {{ Math.ceil(items.length / itemsPerPage) }} 
              <small>({{ items.length }} total lines)</small>
            </div>
            <button class="page-btn" :disabled="currentPage * itemsPerPage >= items.length" @click="currentPage++">
              Next <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { db } from '../db'
import * as XLSX from 'xlsx';

const loading = ref(true)
const reportType = ref('daily')
const selectedDate = ref(new Date().toISOString().substr(0,10))
const selectedMonth = ref(new Date().toISOString().substr(0,7))
const selectedYear = ref(new Date().getFullYear())
const customStart = ref(new Date().toISOString().substr(0,10))
const customEnd = ref(new Date().toISOString().substr(0,10))

const items = ref([])

// Pagination
const currentPage = ref(1)
const itemsPerPage = 15

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return items.value.slice(start, end)
})

watch([reportType, selectedDate, selectedMonth, selectedYear, customStart, customEnd], () => {
    currentPage.value = 1
})

const reportTitle = computed(() => {
  if (reportType.value === 'daily') return `Sales Summary for ${selectedDate.value}`
  if (reportType.value === 'monthly') return `Sales Summary for ${selectedMonth.value}`
  if (reportType.value === 'yearly') return `Annual Sales for ${selectedYear.value}`
  return `Sales Range: ${customStart.value} to ${customEnd.value}`
})

const loadData = async () => {
  loading.value = true
  try {
    // Standardize Range to Local Time
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

    console.log(`[SalesReportDebug] Range: ${start.toLocaleString()} to ${end.toLocaleString()}`)

    const sales = await db.sales.toArray()
    console.log(`[SalesReportDebug] Total rows: ${sales.length}`)
    const list = []
    sales.forEach(s => {
      const d = new Date(s.date)
      if (d >= start && d <= end && s.items) {
        const billDiscPercent = s.discountPercent || 0
        s.items.forEach(i => {
          const itemGross = (Number(i.qty) * Number(i.price))
          const itemDiscShare = itemGross * (billDiscPercent / 100)
          
          list.push({
            date: d,
            invoiceId: s.id && s.id.toString().substring(0,4) === 'INV-' ? s.id : `INV-${s.id.toString().slice(-4).toUpperCase()}`,
            name: i.name,
            qty: i.qty,
            gross: itemGross,
            discount: itemDiscShare,
            net: itemGross - itemDiscShare,
            type: 'Sale'
          })
        })
      }
    })
    items.value = list.sort((a,b) => b.date - a.date)
  } catch (err) { console.error(err) } finally { loading.value = false }
}

const exportToExcel = () => {
  const data = items.value.map(i => ({ 
    "Invoice #": i.invoiceId,
    "Item Name": i.name, 
    "Qty": i.qty, 
    "Gross (Rs)": i.gross,
    "Discount (Rs)": i.discount,
    "Net Revenue (Rs)": i.net
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sales")
  XLSX.writeFile(wb, `Sales_By_Item_Report_Detailed.xlsx`)
}

onMounted(loadData)
</script>

<style scoped>
.pos-container { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; }
.pos-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: white; border-bottom: 2px solid #e2e8f0; }
.header-left { display: flex; align-items: center; gap: 20px; }
.nav-back { color: #475569; font-size: 20px; text-decoration: none; }
.user-info-simple { display: flex; align-items: center; gap: 10px; }
.user-avatar-simple { width: 34px; height: 34px; background: #8c2a3d; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: bold; }
.brand-name { font-weight: 700; color: #1e293b; font-size: 17px; }

.btn-export { background: #217346; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }

.pos-main { flex: 1; padding: 25px; overflow-y: auto; }
.report-content { width: 100%; margin: 0; }

.filter-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 30px; display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; }
.filter-group { display: flex; flex-direction: column; gap: 5px; }
.filter-group label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
.filter-group select, .filter-group input { padding: 9px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; }

.report-title { font-size: 20px; font-weight: 800; color: #1e293b; margin-bottom: 20px; }
.load-state { text-align: center; color: #64748b; padding: 40px; }

.table-container { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { background: #f1f5f9; padding: 15px 20px; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; }
.data-table td { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; font-size: 15px; color: #334155; }
.no-data { text-align: center; color: #94a3b8; padding: 40px; font-weight: 600; }

.pagination-footer { display: flex; align-items: center; justify-content: center; gap: 30px; margin-top: 30px; padding-bottom: 40px; }
.page-btn { background: #fff; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 8px; font-weight: 600; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
.page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #3b82f6; color: #3b82f6; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-weight: bold; color: #1e293b; }
.page-info span { color: #3b82f6; font-size: 18px; }
.page-info small { color: #64748b; margin-left: 10px; font-weight: normal; }
</style>
