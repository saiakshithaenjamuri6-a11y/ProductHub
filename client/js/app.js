/**
 * ProductHub – Frontend Application Logic
 * Modern Minimalist Product Management System
 */

// Application State
const state = {
  products: [],
  stats: {
    totalProducts: 0,
    totalCategories: 0,
    totalInventoryValue: 0
  },
  currentCategory: 'all',
  searchQuery: '',
  currentSort: 'newest',
  viewMode: 'grid', // 'grid' | 'list'
  activeTab: 'dashboard',
  isLoading: false,
  isSubmitting: false,
  editingProduct: null,
  deletingProduct: null
};

// API Endpoint Configuration
const API_BASE = '/api/products';

// Currency Formatter for Indian Rupees (₹)
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

// Category to CSS Badge Mapping
const categoryBadgeMap = {
  'Electronics': 'badge-electronics',
  'Fashion': 'badge-fashion',
  'Accessories': 'badge-accessories',
  'Home Decor': 'badge-homedecor',
  'Beauty': 'badge-beauty',
  'Food': 'badge-food',
  'Books': 'badge-books',
  'Other': 'badge-other'
};

// DOM Element References
const elements = {
  // Navigation & Tabs
  sidebar: document.getElementById('sidebar'),
  hamburgerBtn: document.getElementById('hamburgerBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  navDashboard: document.getElementById('navDashboard'),
  navProducts: document.getElementById('navProducts'),
  navAnalytics: document.getElementById('navAnalytics'),
  navSettings: document.getElementById('navSettings'),
  navProductCount: document.getElementById('navProductCount'),
  breadcrumbCurrent: document.getElementById('breadcrumbCurrent'),
  systemTime: document.getElementById('systemTime'),
  
  // Views
  viewDashboard: document.getElementById('viewDashboard'),
  viewAnalytics: document.getElementById('viewAnalytics'),
  viewSettings: document.getElementById('viewSettings'),
  
  // Stats
  statTotalProducts: document.getElementById('statTotalProducts'),
  statTotalCategories: document.getElementById('statTotalCategories'),
  statTotalValue: document.getElementById('statTotalValue'),
  
  // Controls
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  sortSelect: document.getElementById('sortSelect'),
  viewGridBtn: document.getElementById('viewGridBtn'),
  viewListBtn: document.getElementById('viewListBtn'),
  categoryFilterContainer: document.getElementById('categoryFilterContainer'),
  countAll: document.getElementById('countAll'),
  refreshBtn: document.getElementById('refreshBtn'),
  showingCountBadge: document.getElementById('showingCountBadge'),
  
  // Containers
  productsContainer: document.getElementById('productsContainer'),
  emptyState: document.getElementById('emptyState'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptySubtitle: document.getElementById('emptySubtitle'),
  emptyResetBtn: document.getElementById('emptyResetBtn'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),
  errorBanner: document.getElementById('errorBanner'),
  errorMessage: document.getElementById('errorMessage'),
  retryFetchBtn: document.getElementById('retryFetchBtn'),
  
  // Modals & Triggers
  openAddModalBtn: document.getElementById('openAddModalBtn'),
  addModalBackdrop: document.getElementById('addModalBackdrop'),
  closeAddModalBtn: document.getElementById('closeAddModalBtn'),
  cancelAddBtn: document.getElementById('cancelAddBtn'),
  addProductForm: document.getElementById('addProductForm'),
  saveAddBtn: document.getElementById('saveAddBtn'),
  addBtnSpinner: document.getElementById('addBtnSpinner'),
  
  // Edit Modal
  editModalBackdrop: document.getElementById('editModalBackdrop'),
  closeEditModalBtn: document.getElementById('closeEditModalBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  editProductForm: document.getElementById('editProductForm'),
  saveEditBtn: document.getElementById('saveEditBtn'),
  editBtnSpinner: document.getElementById('editBtnSpinner'),
  editProductId: document.getElementById('editProductId'),
  editProductName: document.getElementById('editProductName'),
  editProductPrice: document.getElementById('editProductPrice'),
  editProductCategory: document.getElementById('editProductCategory'),
  editProductDescription: document.getElementById('editProductDescription'),
  
  // Delete Modal
  deleteModalBackdrop: document.getElementById('deleteModalBackdrop'),
  closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  deleteBtnSpinner: document.getElementById('deleteBtnSpinner'),
  deleteProductNameText: document.getElementById('deleteProductNameText'),
  
  // Analytics Elements
  categoryBarsContainer: document.getElementById('categoryBarsContainer'),
  highestPriceItem: document.getElementById('highestPriceItem'),
  lowestPriceItem: document.getElementById('lowestPriceItem'),
  averagePriceVal: document.getElementById('averagePriceVal'),
  analyticsTotalVal: document.getElementById('analyticsTotalVal'),
  
  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// Toast Notification Utility
// ==========================================================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success' 
    ? `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : type === 'error'
    ? `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  // Auto remove after 4s
  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, 4000);
}

// XSS Sanitizer Helper
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Format Relative / Date
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// ==========================================================================
// API Interaction Functions
// ==========================================================================

async function fetchProducts() {
  state.isLoading = true;
  renderLoadingSkeletons();
  hideErrorBanner();

  try {
    const params = new URLSearchParams();
    if (state.searchQuery) params.append('search', state.searchQuery);
    if (state.currentCategory && state.currentCategory !== 'all') {
      params.append('category', state.currentCategory);
    }
    if (state.currentSort) params.append('sort', state.currentSort);

    const response = await fetch(`${API_BASE}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
    }

    state.products = data.data || [];
    if (data.stats) {
      state.stats = data.stats;
    }

    renderDashboardStats();
    renderProducts();
    renderAnalytics();
  } catch (err) {
    console.error('[App] Error fetching products:', err);
    showErrorBanner(err.message);
  } finally {
    state.isLoading = false;
  }
}

async function createProduct(productData) {
  if (state.isSubmitting) return;
  state.isSubmitting = true;
  setButtonLoading(elements.saveAddBtn, elements.addBtnSpinner, true);

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.errors && Array.isArray(result.errors)) {
        throw new Error(result.errors.join(', '));
      }
      throw new Error(result.message || 'Failed to create product');
    }

    showToast(`"${result.data.name}" added to inventory successfully!`, 'success');
    closeAddModal();
    await fetchProducts();
  } catch (err) {
    console.error('[App] Create product error:', err);
    showToast(err.message, 'error');
  } finally {
    state.isSubmitting = false;
    setButtonLoading(elements.saveAddBtn, elements.addBtnSpinner, false);
  }
}

async function updateProduct(id, productData) {
  if (state.isSubmitting) return;
  state.isSubmitting = true;
  setButtonLoading(elements.saveEditBtn, elements.editBtnSpinner, true);

  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.errors && Array.isArray(result.errors)) {
        throw new Error(result.errors.join(', '));
      }
      throw new Error(result.message || 'Failed to update product');
    }

    showToast(`"${result.data.name}" updated successfully!`, 'success');
    closeEditModal();
    await fetchProducts();
  } catch (err) {
    console.error('[App] Update product error:', err);
    showToast(err.message, 'error');
  } finally {
    state.isSubmitting = false;
    setButtonLoading(elements.saveEditBtn, elements.editBtnSpinner, false);
  }
}

async function deleteProduct(id) {
  if (state.isSubmitting) return;
  state.isSubmitting = true;
  setButtonLoading(elements.confirmDeleteBtn, elements.deleteBtnSpinner, true);

  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete product');
    }

    showToast(`Product deleted successfully from inventory.`, 'success');
    closeDeleteModal();
    await fetchProducts();
  } catch (err) {
    console.error('[App] Delete product error:', err);
    showToast(err.message, 'error');
  } finally {
    state.isSubmitting = false;
    setButtonLoading(elements.confirmDeleteBtn, elements.deleteBtnSpinner, false);
  }
}

// ==========================================================================
// Rendering Logic
// ==========================================================================

function renderDashboardStats() {
  const { totalProducts, totalCategories, totalInventoryValue } = state.stats;

  elements.statTotalProducts.textContent = totalProducts.toLocaleString('en-IN');
  elements.statTotalCategories.textContent = totalCategories.toLocaleString('en-IN');
  elements.statTotalValue.textContent = inrFormatter.format(totalInventoryValue);

  // Update navigation badge
  elements.navProductCount.textContent = totalProducts;
  elements.countAll.textContent = totalProducts;
}

function renderProducts() {
  const container = elements.productsContainer;
  container.innerHTML = '';

  const count = state.products.length;
  elements.showingCountBadge.textContent = `Showing ${count} ${count === 1 ? 'product' : 'products'}`;

  if (count === 0) {
    container.style.display = 'none';
    elements.emptyState.style.display = 'block';

    if (state.searchQuery || state.currentCategory !== 'all') {
      elements.emptyTitle.textContent = 'No matching products';
      elements.emptySubtitle.textContent = `No products found for "${state.searchQuery || state.currentCategory}". Try adjusting your filters.`;
      elements.emptyResetBtn.style.display = 'inline-flex';
    } else {
      elements.emptyTitle.textContent = 'Inventory is empty';
      elements.emptySubtitle.textContent = 'Get started by creating your very first product item.';
      elements.emptyResetBtn.style.display = 'none';
    }
    return;
  }

  container.style.display = state.viewMode === 'grid' ? 'grid' : 'flex';
  elements.emptyState.style.display = 'none';

  state.products.forEach((product) => {
    const card = createProductCardElement(product);
    container.appendChild(card);
  });
}

function createProductCardElement(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.id = product._id;

  const badgeClass = categoryBadgeMap[product.category] || 'badge-other';
  const formattedPrice = inrFormatter.format(product.price);
  const formattedDate = formatDate(product.createdAt);

  card.innerHTML = `
    <div class="product-card-top">
      <span class="category-badge ${badgeClass}">${escapeHtml(product.category)}</span>
      <span class="product-price">${formattedPrice}</span>
    </div>

    <div class="product-card-main">
      <h3 class="product-name" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3>
      <p class="product-desc" title="${escapeHtml(product.description)}">${escapeHtml(product.description)}</p>
    </div>

    <div class="product-card-bottom">
      <span class="product-date">${formattedDate ? `Added ${formattedDate}` : ''}</span>
      <div class="card-actions">
        <button class="btn-card-action btn-card-edit" data-id="${product._id}" aria-label="Edit product">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Edit</span>
        </button>
        <button class="btn-card-action btn-card-delete" data-id="${product._id}" aria-label="Delete product">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;

  // Attach event listeners to card action buttons
  const editBtn = card.querySelector('.btn-card-edit');
  const deleteBtn = card.querySelector('.btn-card-delete');

  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(product);
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDeleteModal(product);
  });

  return card;
}

function renderLoadingSkeletons() {
  const container = elements.productsContainer;
  container.style.display = 'grid';
  elements.emptyState.style.display = 'none';
  container.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton-box skeleton-badge"></div>
      <div class="skeleton-box skeleton-title"></div>
      <div class="skeleton-box skeleton-text-1"></div>
      <div class="skeleton-box skeleton-text-2"></div>
      <div class="skeleton-box skeleton-actions"></div>
    `;
    container.appendChild(skeleton);
  }
}

function renderAnalytics() {
  const products = state.products;
  if (!products || products.length === 0) {
    elements.highestPriceItem.textContent = '-';
    elements.lowestPriceItem.textContent = '-';
    elements.averagePriceVal.textContent = '₹0';
    elements.analyticsTotalVal.textContent = inrFormatter.format(state.stats.totalInventoryValue);
    elements.categoryBarsContainer.innerHTML = '<p class="text-secondary">No data available</p>';
    return;
  }

  // Calculate pricing metrics
  let highest = products[0];
  let lowest = products[0];
  let sum = 0;

  const categoryCounts = {};

  products.forEach((p) => {
    sum += p.price;
    if (p.price > highest.price) highest = p;
    if (p.price < lowest.price) lowest = p;

    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  const avg = sum / products.length;

  elements.highestPriceItem.textContent = `${highest.name} (${inrFormatter.format(highest.price)})`;
  elements.lowestPriceItem.textContent = `${lowest.name} (${inrFormatter.format(lowest.price)})`;
  elements.averagePriceVal.textContent = inrFormatter.format(avg);
  elements.analyticsTotalVal.textContent = inrFormatter.format(state.stats.totalInventoryValue);

  // Render category distribution bars
  const total = products.length;
  elements.categoryBarsContainer.innerHTML = '';

  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const pct = Math.round((count / total) * 100);
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-info">
          <span>${escapeHtml(cat)}</span>
          <span>${count} items (${pct}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      elements.categoryBarsContainer.appendChild(row);
    });
}

function showErrorBanner(msg) {
  elements.errorMessage.textContent = msg || 'Failed to communicate with the server.';
  elements.errorBanner.style.display = 'flex';
}

function hideErrorBanner() {
  elements.errorBanner.style.display = 'none';
}

function setButtonLoading(btn, spinner, isLoading) {
  if (!btn) return;
  const btnText = btn.querySelector('.btn-text');
  if (isLoading) {
    btn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.style.opacity = '0.7';
  } else {
    btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.style.opacity = '1';
  }
}

// ==========================================================================
// Modal Handlers & Validation
// ==========================================================================

function openAddModal() {
  resetAddForm();
  elements.addModalBackdrop.classList.add('show');
  setTimeout(() => {
    document.getElementById('addProductName').focus();
  }, 100);
}

function closeAddModal() {
  elements.addModalBackdrop.classList.remove('show');
  resetAddForm();
}

function resetAddForm() {
  elements.addProductForm.reset();
  clearValidationErrors('add');
}

function openEditModal(product) {
  state.editingProduct = product;
  clearValidationErrors('edit');

  elements.editProductId.value = product._id;
  elements.editProductName.value = product.name;
  elements.editProductPrice.value = product.price;
  elements.editProductCategory.value = product.category;
  elements.editProductDescription.value = product.description;

  elements.editModalBackdrop.classList.add('show');
  setTimeout(() => {
    elements.editProductName.focus();
  }, 100);
}

function closeEditModal() {
  elements.editModalBackdrop.classList.remove('show');
  state.editingProduct = null;
  clearValidationErrors('edit');
}

function openDeleteModal(product) {
  state.deletingProduct = product;
  elements.deleteProductNameText.textContent = `"${product.name}"`;
  elements.deleteModalBackdrop.classList.add('show');
}

function closeDeleteModal() {
  elements.deleteModalBackdrop.classList.remove('show');
  state.deletingProduct = null;
}

function clearValidationErrors(prefix) {
  const fields = ['Name', 'Price', 'Category', 'Description'];
  fields.forEach((field) => {
    const errorEl = document.getElementById(`${prefix}${field}Error`);
    const inputEl = document.getElementById(`${prefix}Product${field}`);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.classList.remove('input-invalid');
  });
}

function validateProductForm(prefix) {
  let isValid = true;
  clearValidationErrors(prefix);

  const nameEl = document.getElementById(`${prefix}ProductName`);
  const priceEl = document.getElementById(`${prefix}ProductPrice`);
  const catEl = document.getElementById(`${prefix}ProductCategory`);
  const descEl = document.getElementById(`${prefix}ProductDescription`);

  const nameVal = nameEl.value.trim();
  const priceVal = priceEl.value.trim();
  const catVal = catEl.value.trim();
  const descVal = descEl.value.trim();

  // Validate Name
  if (!nameVal) {
    document.getElementById(`${prefix}NameError`).textContent = 'Product name is required';
    nameEl.classList.add('input-invalid');
    isValid = false;
  } else if (nameVal.length > 100) {
    document.getElementById(`${prefix}NameError`).textContent = 'Product name cannot exceed 100 characters';
    nameEl.classList.add('input-invalid');
    isValid = false;
  }

  // Validate Price
  const numPrice = Number(priceVal);
  if (!priceVal) {
    document.getElementById(`${prefix}PriceError`).textContent = 'Price is required';
    priceEl.classList.add('input-invalid');
    isValid = false;
  } else if (isNaN(numPrice) || numPrice <= 0) {
    document.getElementById(`${prefix}PriceError`).textContent = 'Price must be a valid positive number';
    priceEl.classList.add('input-invalid');
    isValid = false;
  }

  // Validate Category
  if (!catVal) {
    document.getElementById(`${prefix}CategoryError`).textContent = 'Please select a valid category';
    catEl.classList.add('input-invalid');
    isValid = false;
  }

  // Validate Description
  if (!descVal) {
    document.getElementById(`${prefix}DescriptionError`).textContent = 'Description is required';
    descEl.classList.add('input-invalid');
    isValid = false;
  } else if (descVal.length > 1000) {
    document.getElementById(`${prefix}DescriptionError`).textContent = 'Description cannot exceed 1000 characters';
    descEl.classList.add('input-invalid');
    isValid = false;
  }

  return isValid;
}

// ==========================================================================
// Tab & View Navigation
// ==========================================================================

function switchTab(tabName) {
  state.activeTab = tabName;

  // Update nav links
  const navLinks = [elements.navDashboard, elements.navProducts, elements.navAnalytics, elements.navSettings];
  navLinks.forEach((link) => {
    if (link && link.dataset.tab === tabName) {
      link.classList.add('active');
    } else if (link) {
      link.classList.remove('active');
    }
  });

  // Update view content
  elements.viewDashboard.classList.toggle('active', tabName === 'dashboard' || tabName === 'products');
  elements.viewAnalytics.classList.toggle('active', tabName === 'analytics');
  elements.viewSettings.classList.toggle('active', tabName === 'settings');

  // Update breadcrumb
  const titles = {
    dashboard: 'Dashboard',
    products: 'Products',
    analytics: 'Analytics',
    settings: 'Settings'
  };
  elements.breadcrumbCurrent.textContent = titles[tabName] || 'Dashboard';

  // If opening products, scroll to products section smoothly
  if (tabName === 'products') {
    elements.productsContainer.scrollIntoView({ behavior: 'smooth' });
  }

  // Close mobile sidebar if open
  closeMobileSidebar();
}

function openMobileSidebar() {
  elements.sidebar.classList.add('open');
  elements.sidebarOverlay.classList.add('active');
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove('open');
  elements.sidebarOverlay.classList.remove('active');
}

// Live Time updater in header
function updateLiveTime() {
  const now = new Date();
  elements.systemTime.textContent = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

// ==========================================================================
// Event Listeners Initialization
// ==========================================================================

function initEventListeners() {
  // Navigation Tabs
  elements.navDashboard.addEventListener('click', () => switchTab('dashboard'));
  elements.navProducts.addEventListener('click', () => switchTab('products'));
  elements.navAnalytics.addEventListener('click', () => switchTab('analytics'));
  elements.navSettings.addEventListener('click', () => switchTab('settings'));

  // Mobile Hamburger & Overlay
  elements.hamburgerBtn.addEventListener('click', openMobileSidebar);
  elements.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Sync / Refresh
  elements.refreshBtn.addEventListener('click', () => {
    showToast('Syncing with MongoDB database...', 'info');
    fetchProducts();
  });
  elements.retryFetchBtn.addEventListener('click', fetchProducts);

  // Search Input with Debounce
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    const value = e.target.value;
    state.searchQuery = value.trim();

    if (value.length > 0) {
      elements.clearSearchBtn.style.display = 'flex';
    } else {
      elements.clearSearchBtn.style.display = 'none';
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchProducts();
    }, 300);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    fetchProducts();
  });

  // Sort Selector
  elements.sortSelect.addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    fetchProducts();
  });

  // Grid / List View Toggle
  elements.viewGridBtn.addEventListener('click', () => {
    state.viewMode = 'grid';
    elements.viewGridBtn.classList.add('active');
    elements.viewGridBtn.setAttribute('aria-pressed', 'true');
    elements.viewListBtn.classList.remove('active');
    elements.viewListBtn.setAttribute('aria-pressed', 'false');
    elements.productsContainer.classList.remove('list-view');
    elements.productsContainer.classList.add('grid-view');
  });

  elements.viewListBtn.addEventListener('click', () => {
    state.viewMode = 'list';
    elements.viewListBtn.classList.add('active');
    elements.viewListBtn.setAttribute('aria-pressed', 'true');
    elements.viewGridBtn.classList.remove('active');
    elements.viewGridBtn.setAttribute('aria-pressed', 'false');
    elements.productsContainer.classList.remove('grid-view');
    elements.productsContainer.classList.add('list-view');
  });

  // Category Filter Pills
  elements.categoryFilterContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;

    const category = pill.dataset.category;
    state.currentCategory = category;

    // Update active class
    const pills = elements.categoryFilterContainer.querySelectorAll('.cat-pill');
    pills.forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');

    fetchProducts();
  });

  // Empty state actions
  elements.emptyResetBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    state.currentCategory = 'all';

    const pills = elements.categoryFilterContainer.querySelectorAll('.cat-pill');
    pills.forEach((p) => p.classList.remove('active'));
    elements.categoryFilterContainer.querySelector('[data-category="all"]').classList.add('active');

    fetchProducts();
  });

  elements.emptyAddBtn.addEventListener('click', openAddModal);

  // Add Product Modal Triggers
  elements.openAddModalBtn.addEventListener('click', openAddModal);
  elements.closeAddModalBtn.addEventListener('click', closeAddModal);
  elements.cancelAddBtn.addEventListener('click', closeAddModal);
  elements.addModalBackdrop.addEventListener('click', (e) => {
    if (e.target === elements.addModalBackdrop) closeAddModal();
  });

  // Add Product Form Submission
  elements.addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateProductForm('add')) return;

    const formData = {
      name: document.getElementById('addProductName').value.trim(),
      price: parseFloat(document.getElementById('addProductPrice').value),
      category: document.getElementById('addProductCategory').value,
      description: document.getElementById('addProductDescription').value.trim()
    };

    createProduct(formData);
  });

  // Edit Product Modal Triggers
  elements.closeEditModalBtn.addEventListener('click', closeEditModal);
  elements.cancelEditBtn.addEventListener('click', closeEditModal);
  elements.editModalBackdrop.addEventListener('click', (e) => {
    if (e.target === elements.editModalBackdrop) closeEditModal();
  });

  // Edit Product Form Submission
  elements.editProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateProductForm('edit')) return;

    const id = elements.editProductId.value;
    const formData = {
      name: elements.editProductName.value.trim(),
      price: parseFloat(elements.editProductPrice.value),
      category: elements.editProductCategory.value,
      description: elements.editProductDescription.value.trim()
    };

    updateProduct(id, formData);
  });

  // Delete Product Modal Triggers
  elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  elements.deleteModalBackdrop.addEventListener('click', (e) => {
    if (e.target === elements.deleteModalBackdrop) closeDeleteModal();
  });

  elements.confirmDeleteBtn.addEventListener('click', () => {
    if (state.deletingProduct) {
      deleteProduct(state.deletingProduct._id);
    }
  });

  // Escape Key to Close Open Modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.addModalBackdrop.classList.contains('show')) closeAddModal();
      if (elements.editModalBackdrop.classList.contains('show')) closeEditModal();
      if (elements.deleteModalBackdrop.classList.contains('show')) closeDeleteModal();
    }
  });
}

// ==========================================================================
// Application Bootstrap
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  updateLiveTime();
  initEventListeners();
  fetchProducts();
});
