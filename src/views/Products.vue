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
          <div class="total-products-badge" v-if="products.length > 0">
            <i class="fa-solid fa-layer-group"></i>
            <span>{{ products.length }} items</span>
          </div>
        </div>
      </div>
      <div class="header-right" style="display: flex; gap: 10px; align-items: center;">
        <div class="search-bar" style="max-width: 200px;">
          <i class="fa-solid fa-magnifying-glass search-icon" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #888;"></i>
          <input type="text" v-model="searchQuery" placeholder="Search..." style="width: 100%; padding: 8px 15px 8px 35px; border-radius: 5px; border: 1px solid #ddd;">
        </div>
        
        <!-- Bulk Operations -->
        <button v-if="selectedProducts.length > 0" class="btn-bulk delete" @click="deleteSelectedProducts" style="border-color: #dc3545; color: #dc3545;">
          <i class="fa-solid fa-trash-can"></i> Delete ({{ selectedProducts.length }})
        </button>
        <button class="btn-bulk export" @click="exportProductsToExcel" title="Export to Excel">
          <i class="fa-solid fa-file-export"></i> Export
        </button>
        <button class="btn-bulk import" @click="showImportModal = true" title="Import from Excel">
          <i class="fa-solid fa-file-import"></i> Import
        </button>

        <button class="btn-add-main" @click="openAddPopup">
          <i class="fa-solid fa-plus"></i> Add
        </button>
        <button @click="logout" class="btn-logout-small" title="Logout">
          <i class="fa-solid fa-power-off"></i>
        </button>
      </div>
    </header>

    <main class="pos-main" style="padding: 25px; overflow-y: auto; background: #fdfdfd;">
      <div class="toolbar-secondary" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #f0f0f0;">
        <div class="view-toggles" style="display: flex; gap: 8px;">
          <button @click="viewMode = 'grid'" :class="{ active: viewMode === 'grid' }" class="btn-toggle" title="Grid View">
            <i class="fa-solid fa-grip"></i>
          </button>
          <button @click="viewMode = 'compact'" :class="{ active: viewMode === 'compact' }" class="btn-toggle" title="Compact View">
            <i class="fa-solid fa-grip-vertical"></i>
          </button>
          <button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }" class="btn-toggle" title="List View">
            <i class="fa-solid fa-list"></i>
          </button>
        </div>

        <div class="pagination-controls" style="display: flex; align-items: center; gap: 15px;">
           <span style="font-size: 13px; color: #666;">Page {{ currentPage }} of {{ totalPages }}</span>
           <div style="display: flex; gap: 5px;">
             <button @click="prevPage" :disabled="currentPage === 1" class="btn-page"><i class="fa-solid fa-chevron-left"></i></button>
             <button @click="nextPage" :disabled="currentPage === totalPages" class="btn-page"><i class="fa-solid fa-chevron-right"></i></button>
           </div>
        </div>
      </div>

      <!-- Grid View (Standard) -->
      <div v-if="viewMode === 'grid'" class="product-grid">
        <div class="product-card" v-for="prod in paginatedProducts" :key="prod.id">
          <div class="card-image-box">
             <img v-if="prod.image" :src="prod.image" alt="Product">
             <div v-else class="no-image-placeholder">No Image</div>
          </div>
          <div class="card-body">
            <div class="product-name">{{ prod.name }}</div>
            <div class="product-price">Rs. {{ Number(prod.price).toFixed(2) }}</div>
            <div class="product-stock">Stock: <span :class="{ 'low-stock': prod.stock !== null && prod.stock !== undefined && (prod.stock||0) <= 5 }">{{ (prod.stock === null || prod.stock === undefined || prod.stock === '') ? '∞' : prod.stock }}</span></div>
            <div class="card-actions">
              <input type="checkbox" v-model="selectedProducts" :value="prod.id" class="bulk-checkbox">
              <button class="btn-action edit" @click="openEditPopup(prod)"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-action delete" @click="deleteProduct(prod.id)"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Compact View -->
      <div v-if="viewMode === 'compact'" class="product-grid compact">
        <div class="product-card small" v-for="prod in paginatedProducts" :key="prod.id">
          <div class="card-image-box-small">
             <img v-if="prod.image" :src="prod.image" alt="Product">
             <div v-else class="no-image-placeholder-small">X</div>
          </div>
          <div class="card-body-small">
            <div class="product-name-small">{{ prod.name }}</div>
            <div class="product-info-small">
              <span class="price-small">Rs.{{ Number(prod.price).toFixed(0) }}</span>
              <span class="stock-small" :class="{ 'low-stock': prod.stock !== null && prod.stock !== undefined && (prod.stock||0) <= 5 }">Stk: {{ (prod.stock === null || prod.stock === undefined || prod.stock === '') ? '∞' : prod.stock }}</span>
            </div>
            <div class="card-actions-small">
              <button class="btn-action-small edit" @click="openEditPopup(prod)"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-action-small delete" @click="deleteProduct(prod.id)"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-if="viewMode === 'list'" class="product-list-container">
        <table class="product-list-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll">
              </th>
              <th>Image</th>
              <th>Product Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="prod in paginatedProducts" :key="prod.id">
              <td style="text-align: center;">
                <input type="checkbox" v-model="selectedProducts" :value="prod.id">
              </td>
              <td>
                <div class="list-img-box">
                  <img v-if="prod.image" :src="prod.image" />
                  <div v-else class="list-no-img">X</div>
                </div>
              </td>
              <td class="list-prod-name">{{ prod.name }}</td>
              <td class="list-prod-price">Rs. {{ Number(prod.price).toFixed(2) }}</td>
              <td><span :class="{ 'low-stock': prod.stock !== null && prod.stock !== undefined && (prod.stock||0) <= 5 }" class="list-stock-badge">{{ (prod.stock === null || prod.stock === undefined || prod.stock === '') ? '∞' : prod.stock }}</span></td>
              <td style="text-align: right;">
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                  <button class="btn-list-action edit" @click="openEditPopup(prod)"><i class="fa-solid fa-pen"></i> Edit</button>
                  <button class="btn-list-action delete" @click="deleteProduct(prod.id)"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="paginatedProducts.length === 0" class="empty-inventory" style="text-align: center; padding: 100px 0; color: #aaa;">
         <i class="fa-solid fa-boxes-stacked" style="font-size: 50px; margin-bottom: 20px;"></i>
         <p>No products found in this view.</p>
      </div>

      <!-- Add/Edit Modal -->
      <div v-if="showPopup" class="modal-overlay">
        <div class="modal-content">
          <h2 style="margin-bottom: 25px;">{{ isEditing ? 'Edit Product' : 'Add New Product' }}</h2>
          <form @submit.prevent="saveProduct">
            <div class="form-group">
              <label>Product Name</label>
              <input type="text" v-model="form.name" required placeholder="Ex: Chocolate Cake">
            </div>
            <div class="form-group">
              <label>Price (Rs)</label>
              <input type="number" v-model="form.price" step="0.01" required placeholder="0.00">
            </div>
            <div class="form-group">
              <label>Current Stock (Optional)</label>
              <input type="number" v-model="form.stock" placeholder="Leave empty for infinite">
            </div>
            <div class="form-group">
              <label>Product Image</label>
              <input type="file" accept="image/*" @change="handleImageUpload" class="file-input">
            </div>
            <div class="modal-actions" style="margin-top: 30px;">
              <button type="button" class="btn-cancel" @click="closePopup">Cancel</button>
              <button type="submit" class="btn-save">{{ isEditing ? 'Update Product' : 'Save Product' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Import Modal -->
      <div v-if="showImportModal" class="modal-overlay">
        <div class="modal-content" style="max-width: 450px;">
          <h2 style="margin-bottom: 15px;">Import Products</h2>
          <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Use our official template to bulk import products into your inventory.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px dashed #ccc; text-align: center; margin-bottom: 25px;">
             <button class="btn-download-tmpl" @click="downloadTemplate">
               <i class="fa-solid fa-download"></i> Download Excel Template
             </button>
          </div>

          <div class="form-group">
             <label>Select Filled Template (.xlsx)</label>
             <input type="file" accept=".xlsx, .xls" @change="handleFileUpload" class="file-input" style="padding: 10px; border: 1px solid #ddd;">
          </div>

          <div class="modal-actions" style="margin-top: 30px;">
            <button type="button" class="btn-cancel" @click="showImportModal = false">Close</button>
            <button type="button" class="btn-save" @click="processImport" :disabled="!selectedFile">Process Import</button>
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
const logout = async () => { try { router.push('/') } catch (err) { console.error(err) } }

const products = ref([])
const showPopup = ref(false)
const showImportModal = ref(false)
const isEditing = ref(false)
const selectedFile = ref(null)
const selectedProducts = ref([])
const form = ref({ id: null, name: '', price: '', stock: '', image: '' })

const isAllSelected = computed(() => {
  if (paginatedProducts.value.length === 0) return false
  return paginatedProducts.value.every(p => selectedProducts.value.includes(p.id))
})

const toggleSelectAll = (e) => {
  const isChecked = e.target.checked
  const currentPageIds = paginatedProducts.value.map(p => p.id)
  
  if (isChecked) {
    // Add missing IDs from current page
    const newSelection = [...selectedProducts.value]
    currentPageIds.forEach(id => {
      if (!newSelection.includes(id)) newSelection.push(id)
    })
    selectedProducts.value = newSelection
  } else {
    // Remove IDs of current page
    selectedProducts.value = selectedProducts.value.filter(id => !currentPageIds.includes(id))
  }
}

// View and Pagination State
const viewMode = ref(localStorage.getItem('pos_inventory_view') || 'grid') // 'grid', 'compact', 'list'
const currentPage = ref(1)
const itemsPerPage = ref(viewMode.value === 'list' ? 15 : (viewMode.value === 'compact' ? 24 : 12))

const searchQuery = ref('')
const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  return products.value.filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// Pagination Logic
const totalPages = computed(() => Math.ceil(filteredProducts.value.length / itemsPerPage.value) || 1)
const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredProducts.value.slice(start, end)
})

const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }

// Reset page when searching
watch(searchQuery, () => { currentPage.value = 1 })
// Adjust items per page based on view mode
watch(viewMode, (newMode) => {
    localStorage.setItem('pos_inventory_view', newMode)
    if (newMode === 'list') itemsPerPage.value = 15
    else if (newMode === 'compact') itemsPerPage.value = 24
    else itemsPerPage.value = 12
    currentPage.value = 1
})

const fetchProducts = async () => {
  try {
    products.value = await db.pos_products.toArray()
  } catch (error) { console.error(error) }
}

onMounted(() => { 
  fetchProducts()
})

const openAddPopup = () => {
  isEditing.value = false
  form.value = { id: null, name: '', price: '', stock: 0, image: '' }
  showPopup.value = true
}

const openEditPopup = (prod) => {
  isEditing.value = true
  form.value = { ...prod }
  showPopup.value = true
}

const closePopup = () => { showPopup.value = false }

const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => { form.value.image = e.target.result }
  reader.readAsDataURL(file)
}

const saveProduct = async () => {
  try {
    // DUPLICATE CHECK: Names must be unique
    const existing = await db.pos_products.where('name').equalsIgnoreCase(form.value.name).first()
    if (existing && (!isEditing.value || (isEditing.value && existing.id !== form.value.id))) {
      alert(`The product name "${form.value.name}" already exists! Please use a unique name.`)
      return
    }

    const productData = { 
      name: form.value.name, 
      price: Number(form.value.price), 
      stock: Number(form.value.stock),
      image: form.value.image || '' 
    }
    if (isEditing.value) await db.pos_products.update(form.value.id, productData)
    else await db.pos_products.add(productData)
    closePopup()
    fetchProducts()
  } catch (error) { alert("Error saving product: " + error.message) }
}

const deleteProduct = async (id) => {
  if (confirm("Delete this product permanently?")) {
    await db.pos_products.delete(id)
    selectedProducts.value = selectedProducts.value.filter(sid => sid !== id)
    fetchProducts()
  }
}

const deleteSelectedProducts = async () => {
  if (selectedProducts.value.length === 0) return
  if (confirm(`Are you sure you want to delete ${selectedProducts.value.length} selected products?`)) {
    try {
      await db.pos_products.bulkDelete(selectedProducts.value)
      selectedProducts.value = []
      fetchProducts()
    } catch (err) {
      alert("Error deleting products: " + err.message)
    }
  }
}

// EXPORT Feature
const exportProductsToExcel = () => {
  const data = products.value.map(p => ({
    "Product Name": p.name,
    "Price (Rs)": p.price,
    "Stock Quantity": p.stock || 0
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  XLSX.writeFile(wb, "Product_Inventory_Export.xlsx");
}

// IMPORT Features
const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    { "Product Name": "Example Product 1", "Price": 150.00, "Stock": 25 },
    { "Product Name": "Example Product 2", "Price": 45.50, "Stock": 100 }
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "Product_Import_Template.xlsx");
}

const handleFileUpload = (e) => {
  selectedFile.value = e.target.files[0];
}

const processImport = () => {
  if (!selectedFile.value) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const items = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      
      const toAdd = items.map(i => ({
        name: i["Product Name"] || i["name"] || "Unnamed Product",
        price: Number(i["Price"] || i["price"] || 0),
        stock: Number(i["Stock"] || i["stock"] || 0),
        image: ''
      }));

      await db.pos_products.bulkAdd(toAdd);
      alert(`${toAdd.length} products imported successfully!`);
      showImportModal.value = false;
      selectedFile.value = null;
      fetchProducts();
    } catch (err) {
      alert("Error reading file: " + err.message);
    }
  };
  reader.readAsArrayBuffer(selectedFile.value);
}
</script>


<style scoped>
.pos-main { background: #fdfdfd; display: block; }

/* Toolbar & Toggles */
.btn-toggle, .btn-page {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-toggle.active {
  background: #2c3e50;
  color: white;
  border-color: #2c3e50;
}
.btn-toggle:hover:not(.active), .btn-page:hover:not(:disabled) {
  background: #edf2f7;
  color: #1a202c;
}
.btn-page:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.total-products-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  color: #475569;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #e2e8f0;
  margin-left: 15px;
}
.total-products-badge i { color: #8C2A3D; font-size: 11px; }

/* Standard Grid */
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
.product-card { background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; overflow: hidden; transition: transform 0.2s; }
.product-card:hover { transform: translateY(-3px); }
.card-image-box { width: 100%; height: 140px; background: #fafafa; border-bottom: 1px solid #f9f9f9; display: flex; align-items: center; justify-content: center; }
.card-image-box img { width: 100%; height: 100%; object-fit: cover; }
.card-body { padding: 15px; }
.product-name { font-weight: 700; font-size: 16px; color: #333; margin-bottom: 8px; }
.product-price { color: #8C2A3D; font-weight: 800; font-size: 18px; }
.product-stock { margin-top: 5px; font-size: 13px; color: #888; }
.low-stock { color: #dc3545; font-weight: 900; }

/* Compact Grid */
.product-grid.compact { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.product-card.small { border-radius: 8px; }
.card-image-box-small { width: 100%; height: 80px; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.card-image-box-small img { width: 100%; height: 100%; object-fit: cover; }
.card-body-small { padding: 10px; }
.product-name-small { font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-info-small { display: flex; justify-content: space-between; margin-top: 4px; }
.price-small { font-size: 13px; font-weight: 800; color: #8C2A3D; }
.stock-small { font-size: 11px; color: #666; }
.card-actions-small { display: flex; gap: 5px; margin-top: 8px; }
.btn-action-small { flex: 1; padding: 4px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-action-small.edit { background: #fff8e1; color: #ffa000; }
.btn-action-small.delete { background: #ffebee; color: #d32f2f; }

/* List View Table */
.product-list-container { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
.product-list-table { width: 100%; border-collapse: collapse; text-align: left; }
.product-list-table th { background: #f8fafc; padding: 15px; font-size: 13px; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; }
.product-list-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.list-img-box { width: 45px; height: 45px; background: #f1f5f9; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.list-img-box img { width: 100%; height: 100%; object-fit: cover; }
.list-prod-name { font-weight: 700; color: #1e293b; }
.list-prod-price { font-weight: 800; color: #8C2A3D; }
.list-stock-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.btn-list-action { padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
.btn-list-action.edit { background: #f1f5f9; color: #475569; }
.btn-list-action.delete { background: #fee2e2; color: #ef4444; }

/* Rest of the styles */
.card-actions { margin-top: 15px; display: flex; gap: 8px; }
.btn-action { flex: 1; padding: 10px; border: none; border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.btn-action.edit { background: #fff8e1; color: #ffa000; }
.btn-action.delete { background: #ffebee; color: #d32f2f; }

.btn-bulk { background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; color: #555; }
.btn-bulk.export { border-color: #2e7d32; color: #2e7d32; }
.btn-bulk.import { border-color: #3b82f6; color: #3b82f6; }
.btn-bulk.delete { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
.btn-bulk.delete:hover { background: #fee2e2; }

.bulk-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #8C2A3D;
}
.product-card .bulk-checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 5;
  background: white;
  border-radius: 4px;
}
.btn-add-main { background: #2c3e50; color: white; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-logout-small { background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.modal-content { background: white; padding: 35px; border-radius: 12px; width: 100%; max-width: 450px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 700; font-size: 14px; color: #555; }
.form-group input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
.btn-download-tmpl { background: #34495e; color: white; border: none; padding: 12px 20px; border-radius: 30px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.modal-actions { display: flex; gap: 15px; }
.btn-cancel { flex: 1; padding: 14px; background: #f5f5f5; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 16px; color: #666; }
.btn-save { flex: 1; padding: 14px; background: #2e7d32; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 16px; }
</style>
