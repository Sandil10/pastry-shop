<template>
  <div class="pos-container">
    <header class="pos-header">
      <div class="header-left">
        <router-link to="/analytics" class="nav-back">
          <i class="fa-solid fa-arrow-left"></i>
        </router-link>
        <div class="user-info-simple">
          <div class="user-avatar-simple">R</div>
          <span class="brand-name">Shift Reconciliation Report</span>
        </div>
      </div>
      <div class="header-right" style="display:flex; gap:10px;">
        <button @click="exportToExcel" class="btn-export excel">
          <i class="fa-solid fa-file-excel"></i> Export Excel
        </button>
        <button @click="exportToPDF" class="btn-export pdf">
          <i class="fa-solid fa-file-pdf"></i> Export PDF
        </button>
      </div>
    </header>

    <main class="pos-main">
      <div class="report-content">
        <!-- Filtration SAME AS SALES REPORT -->
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

        <div v-if="loading" class="load-state">Fetching shift records...</div>
        <div v-else>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Closed Date/Time</th>
                  <th style="text-align: left;">Cashier</th>
                  <th style="text-align: center;">Opening Balance</th>
                  <th style="text-align: center;">Total Cash</th>
                  <th style="text-align: center;">Total Card</th>
                  <th style="text-align: right;">Difference (Rs)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="shift in paginatedShifts" :key="shift.id">
                  <td style="text-align: left; font-weight: 600;">{{ new Date(shift.closedAt).toLocaleString() }}</td>
                  <td style="text-align: left;">{{ shift.cashier }}</td>
                  <td style="text-align: center;">Rs. {{ Number(shift.openBalance).toFixed(2) }}</td>
                  <td style="text-align: center; color: #2e7d32; font-weight: bold;">Rs. {{ Number(shift.totalCashSales).toFixed(2) }}</td>
                  <td style="text-align: center; color: #0369a1; font-weight: bold;">Rs. {{ Number(shift.totalCardSales).toFixed(2) }}</td>
                  <td style="text-align: right;" :style="{ color: shift.difference < 0 ? '#dc3545' : '#2e7d32', fontWeight: 800 }">
                    Rs. {{ Number(shift.difference).toFixed(2) }}
                  </td>
                </tr>
                <tr v-if="shifts.length === 0">
                  <td colspan="6" class="no-data">No shift closings found for this period.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Controls -->
          <div v-if="shifts.length > itemsPerPage" class="pagination-footer">
            <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
              <i class="fa-solid fa-chevron-left"></i> Previous
            </button>
            <div class="page-info">
              Page <span>{{ currentPage }}</span> of {{ Math.ceil(shifts.length / itemsPerPage) }} 
              <small>({{ shifts.length }} total records)</small>
            </div>
            <button class="page-btn" :disabled="currentPage * itemsPerPage >= shifts.length" @click="currentPage++">
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
import { systemSettings } from '../composables/useSettings'
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';

const getLocalYMD = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const loading = ref(true)
const reportType = ref('daily')
const selectedDate = ref(getLocalYMD())
const selectedMonth = ref(getLocalYMD().substr(0,7))
const selectedYear = ref(new Date().getFullYear())
const customStart = ref(getLocalYMD())
const customEnd = ref(getLocalYMD())

const shifts = ref([])

// Pagination
const currentPage = ref(1)
const itemsPerPage = 15

const paginatedShifts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return shifts.value.slice(start, end)
})

watch([reportType, selectedDate, selectedMonth, selectedYear, customStart, customEnd], () => {
    currentPage.value = 1
})

const reportTitle = computed(() => {
  if (reportType.value === 'daily') return `Daily Reconciliation: ${selectedDate.value}`
  if (reportType.value === 'monthly') return `Monthly Reconciliation: ${selectedMonth.value}`
  if (reportType.value === 'yearly') return `Yearly Audit: ${selectedYear.value}`
  return `Audit Range: ${customStart.value} to ${customEnd.value}`
})

const loadData = async () => {
  loading.value = true
  try {
    let start, end;
    if (reportType.value === 'daily') {
      start = new Date(selectedDate.value); start.setHours(0,0,0,0)
      end = new Date(selectedDate.value); end.setHours(23,59,59,999)
    } else if (reportType.value === 'monthly') {
      const p = selectedMonth.value.split('-')
      start = new Date(p[0], p[1]-1, 1)
      end = new Date(p[0], p[1], 0, 23, 59, 59, 999)
    } else if (reportType.value === 'yearly') {
      start = new Date(selectedYear.value, 0, 1)
      end = new Date(selectedYear.value, 11, 31, 23, 59, 59, 999)
    } else {
      start = new Date(customStart.value); start.setHours(0,0,0,0)
      end = new Date(customEnd.value); end.setHours(23,59,59,999)
    }

    const all = await db.shifts.toArray()
    shifts.value = all
      .filter(s => {
        const d = new Date(s.closedAt)
        return d >= start && d <= end
      })
      .sort((a,b) => new Date(b.closedAt) - new Date(a.closedAt))
  } catch (err) { console.error(err) } finally { loading.value = false }
}

const exportToExcel = () => {
  const data = shifts.value.map(s => ({
    "Date": new Date(s.closedAt).toLocaleString(),
    "Cashier": s.cashier,
    "Opening Rs": s.openBalance,
    "Cash Sales Rs": s.totalCashSales,
    "Card Sales Rs": s.totalCardSales,
    "Difference Rs": s.difference
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Shifts")
  XLSX.writeFile(wb, "Shift_History_Report.xlsx")
}

const exportToPDF = () => {
  const doc = new jsPDF()
  doc.setFontSize(22)
  doc.text(`${systemSettings.value.systemName} - Shift Audit`, 105, 15, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`Period: ${reportTitle.value}`, 105, 23, { align: 'center' })

  const tableData = shifts.value.map(s => [
    new Date(s.closedAt).toLocaleString(),
    s.cashier,
    Number(s.openBalance || 0).toFixed(2),
    Number(s.totalCashSales || 0).toFixed(2),
    Number(s.totalCardSales || 0).toFixed(2),
    Number(s.difference || 0).toFixed(2)
  ])

  doc.autoTable({
    head: [['Date', 'Cashier', 'Opening', 'Cash', 'Card', 'Diff']],
    body: tableData,
    startY: 30,
    theme: 'grid',
    styles: { fontSize: 8 }
  })
  doc.save("Shift_Audit_Report.pdf")
}

onMounted(loadData)
</script>

<style scoped>
.pos-container { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; }
.pos-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: white; border-bottom: 2px solid #e2e8f0; }
.header-left { display: flex; align-items: center; gap: 20px; }
.nav-back { color: #475569; font-size: 20px; text-decoration: none; }
.user-info-simple { display: flex; align-items: center; gap: 10px; }
.user-avatar-simple { width: 34px; height: 34px; background: #ea580c; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: bold; }
.brand-name { font-weight: 700; color: #1e293b; font-size: 17px; }

.btn-export { color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-export.excel { background: #217346; }
.btn-export.pdf { background: #e74c3c; }

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
