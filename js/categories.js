// Categories Manager
// Hardcoded currencies available globally
window.HARDCODED_CURRENCIES = [
    { Currency: 'US Dollar', Symbol: '$', 'Currency Code': 'USD' },
    { Currency: 'Euro', Symbol: '€', 'Currency Code': 'EUR' },
    { Currency: 'British Pound', Symbol: '£', 'Currency Code': 'GBP' },
    { Currency: 'Indian Rupee', Symbol: '₹', 'Currency Code': 'INR' },
    { Currency: 'Japanese Yen', Symbol: '¥', 'Currency Code': 'JPY' },
    { Currency: 'Australian Dollar', Symbol: 'A$', 'Currency Code': 'AUD' },
    { Currency: 'Canadian Dollar', Symbol: 'C$', 'Currency Code': 'CAD' },
    { Currency: 'Chinese Yuan', Symbol: '¥', 'Currency Code': 'CNY' },
    { Currency: 'Swiss Franc', Symbol: 'Fr', 'Currency Code': 'CHF' }
];
class CategoriesManager {
    constructor() {
        this.currentCategory = 'Currencies';
        this.editingIndex = -1;
    }

    init() {
        this.renderCategoryTabs();
        this.refresh();
        // Ensure the first tab content is shown
        this.currentCategory = 'Currencies';

        // Wait a moment for Bootstrap to initialize, then render content
        setTimeout(() => {
            this.renderCategoryContent();
            
            // Force render content for the active tab after a longer delay
            setTimeout(() => {
                this.renderCategoryContent();
            }, 500);
        }, 200);
    }

    refresh() {
        this.renderCategoryContent();
    }

    renderCategoryTabs() {
        const categories = dataManager.getData('categories');
        if (!categories) return;

        const tabContent = document.getElementById('categoryTabContent');
        if (!tabContent) return;

        // Clear existing content
        tabContent.innerHTML = '';

        const categoryTypes = ['Currencies', 'Income', 'Expenses', 'Accounts', 'Debt Pay-Off', 'Investments'];
        
        categoryTypes.forEach((categoryType, index) => {
            const isActive = index === 0 ? 'show active' : '';
            const tabId = this.getTabIdFromCategory(categoryType);

            const tabPane = document.createElement('div');
            tabPane.className = `tab-pane fade ${isActive}`;
            tabPane.id = tabId;
            tabPane.innerHTML = this.getCategoryTabContent(categoryType);

            tabContent.appendChild(tabPane);
        });

        // Add event listeners for tab switches
        document.querySelectorAll('#categoryTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetId = e.target.getAttribute('data-bs-target').substring(1);
                this.currentCategory = this.getCategoryTypeFromTabId(targetId);
                this.renderCategoryContent();
            });
        });

        // Ensure the first tab is active and trigger Bootstrap tab
        setTimeout(() => {
            const firstTab = document.querySelector('#categoryTabs button[data-bs-toggle="tab"]');
            if (firstTab) {
                // Make sure the first tab has active class
                document.querySelectorAll('#categoryTabs .nav-link').forEach(link => link.classList.remove('active'));
                firstTab.classList.add('active');

                // Always use manual activation for reliability
                const targetId = firstTab.getAttribute('data-bs-target').substring(1);
                const targetContent = document.getElementById(targetId);
                if (targetContent) {
                    document.querySelectorAll('#categoryTabContent .tab-pane').forEach(pane => {
                        pane.classList.remove('show', 'active');
                    });
                    targetContent.classList.add('show', 'active');
                }
            }
        }, 300);
    }

    getCategoryTypeFromTabId(tabId) {
        const mapping = {
            'currencies': 'Currencies',
            'income': 'Income',
            'expenses': 'Expenses',
            'accounts': 'Accounts',
            'debt': 'Debt Pay-Off',
            'investments': 'Investments'
        };
        return mapping[tabId] || 'Currencies';
    }

    getTabIdFromCategory(categoryType) {
        const mapping = {
            'Currencies': 'currencies',
            'Income': 'income',
            'Expenses': 'expenses',
            'Accounts': 'accounts',
            'Debt Pay-Off': 'debt',
            'Investments': 'investments'
        };
        return mapping[categoryType] || 'currencies';
    }

    getSingularForm(categoryType) {
        const mapping = {
            'Currencies': 'Currency',
            'Income': 'Income Source',
            'Expenses': 'Expense Category',
            'Accounts': 'Account',
            'Debt Pay-Off': 'Debt Pay-Off Item',
            'Investments': 'Investment'
        };
        return mapping[categoryType] || categoryType.slice(0, -1);
    }

    getCategoryTabContent(categoryType) {
        const tabId = this.getTabIdFromCategory(categoryType);
        
        return `
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">${categoryType} List</h5>
                            ${categoryType !== 'Currencies' ? `
                                <button class="btn btn-primary btn-sm" onclick="categoriesManager.showAddModal('${categoryType}')">
                                    <i class="bi bi-plus-lg me-1"></i>Add ${this.getSingularForm(categoryType)}
                                </button>
                            ` : ''}
                        </div>
                        <div class="card-body">
                            <div id="${tabId}-list" class="table-responsive">
                                <!-- Content will be dynamically generated -->
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Quick Info</h5>
                        </div>
                        <div class="card-body">
                            <div id="${tabId}-stats">
                                <!-- Stats will be dynamically generated -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add/Edit Modal -->
            <div class="modal fade" id="${tabId}-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${tabId}-modal-title">Add ${this.getSingularForm(categoryType)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="${tabId}-form">
                                ${this.getCategoryFormFields(categoryType)}
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="categoriesManager.saveCategory('${categoryType}')">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoryFormFields(categoryType) {
        if (categoryType === 'Currencies') {
            return `
                <div class="mb-3">
                    <label for="currency-name" class="form-label">Currency Name</label>
                    <input type="text" class="form-control" id="currency-name" required>
                </div>
                <div class="mb-3">
                    <label for="currency-symbol" class="form-label">Symbol</label>
                    <input type="text" class="form-control" id="currency-symbol" required>
                </div>
                <div class="mb-3">
                    <label for="currency-code" class="form-label">Currency Code</label>
                    <input type="text" class="form-control" id="currency-code" required maxlength="3">
                </div>
            `;
        } else {
            return `
                <div class="mb-3">
                    <label for="category-name" class="form-label">${this.getSingularForm(categoryType)} Name</label>
                    <input type="text" class="form-control" id="${this.getTabIdFromCategory(categoryType)}-edit" required>
                </div>
            `;
        }
    }

    renderCategoryContent() {
        const categories = dataManager.getData('categories');
        if (!categories) {
            return;
        }

        const categoryData = this.currentCategory === 'Currencies'
            ? (window.HARDCODED_CURRENCIES || [])
            : (categories[this.currentCategory] || []);
        const tabId = this.getTabIdFromCategory(this.currentCategory);
        const listContainer = document.getElementById(`${tabId}-list`);
        const statsContainer = document.getElementById(`${tabId}-stats`);

        if (!listContainer || !statsContainer) {
            return;
        }

        // Render list
        if (this.currentCategory === 'Currencies') {
            this.renderCurrencyList(listContainer, categoryData);
        } else {
            this.renderSimpleList(listContainer, categoryData);
        }

        // Render stats
        this.renderCategoryStats(statsContainer, categoryData);
    }

    renderCurrencyList(container, currencies) {
        // Always render from hardcoded list
        const list = Array.isArray(window.HARDCODED_CURRENCIES) ? window.HARDCODED_CURRENCIES : [];
        if (list.length === 0) {
            container.innerHTML = '<p class="text-muted">No currencies added yet.</p>';
            return;
        }

        const table = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Currency</th>
                        <th>Symbol</th>
                        <th>Code</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map((currency) => `
                        <tr>
                            <td>${currency.Currency || currency['Currency']}</td>
                            <td>${currency.Symbol}</td>
                            <td><span class="badge bg-primary">${currency['Currency Code']}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = table;
    }

    renderSimpleList(container, items) {
        if (items.length === 0) {
            container.innerHTML = `<p class="text-muted">No ${this.currentCategory.toLowerCase()} added yet.</p>`;
            return;
        }

        const list = `
            <div class="list-group">
                ${items.map((item, index) => `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${item}</span>
                        <div>
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="categoriesManager.editCategory('${this.currentCategory}', ${index})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="categoriesManager.deleteCategory('${this.currentCategory}', ${index})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.innerHTML = list;
    }

    renderCategoryStats(container, data) {
        const count = (this.currentCategory === 'Currencies')
            ? (window.HARDCODED_CURRENCIES?.length || 0)
            : data.length;
        
        container.innerHTML = `
            <div class="mb-4">
                <div class="text-muted">
                    <ul class="list-unstyled mb-0">
                        <li class="mb-0">
                            <strong>Currencies</strong> – Pre-configured currency options.
                            Cannot be modified to maintain data consistency.
                        </li>
                        <li class="mb-2">
                            <strong>Income</strong> – Add, edit or remove income sources.
                            They show up in planning and transaction entries.
                        </li>
                        <li class="mb-2">
                            <strong>Expenses</strong> – Manage categories for your spending.
                            Used when logging expenses and budgeting.
                        </li>
                        <li class="mb-2">
                            <strong>Accounts</strong> – Manage your bank accounts, wallets, or cash.
                            These can be used while recording transactions.
                        </li>
                        <li class="mb-2">
                            <strong>Debt Pay-Off</strong> – Track your loans, cards, or borrowings.
                            Use these to record debt repayments.
                        </li>
                        <li class="mb-2">
                            <strong>Investments</strong> – Add investment categories like stocks or savings.
                            These appear in investment tracking in future.
                        </li>
                    </ul>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                <span class="fw-semibold">Total Items:</span>
                <span class="badge bg-primary fs-6">${count}</span>
            </div>
        `;
    }

    showAddModal(categoryType) {
        this.editingIndex = -1;
        const tabId = this.getTabIdFromCategory(categoryType);
        const title = document.getElementById(`${tabId}-modal-title`);
        const form = document.getElementById(`${tabId}-form`);

        if (title) {
            title.textContent = `Add ${this.getSingularForm(categoryType)}`;
        }

        if (form) {
            clearForm(form);
        }

        showModal(`${tabId}-modal`);
    }

    editCategory(categoryType, index) {
        
        this.editingIndex = index;
        const categories = dataManager.getData('categories');
        
        const item = categories[categoryType][index];
        const tabId = this.getTabIdFromCategory(categoryType);
        const title = document.getElementById(`${tabId}-modal-title`);

        if (title) {
            title.textContent = `Edit ${this.getSingularForm(categoryType)}`;
        }

        // Wait a moment for the modal content to be available
        setTimeout(() => {
            if (categoryType === 'Currencies') {
                const nameField = document.getElementById('currency-name');
                const symbolField = document.getElementById('currency-symbol');
                const codeField = document.getElementById('currency-code');

                if (nameField) nameField.value = item.Currency || item['Currency'];
                if (symbolField) symbolField.value = item.Symbol;
                if (codeField) codeField.value = item['Currency Code'];
            } else {
                const nameField = document.getElementById(tabId + '-edit');
                if (window.DEBUG) console.log('Edit field element:', nameField);
                if (nameField) nameField.value = item;
            }
        }, 100);

        showModal(`${tabId}-modal`);
    }

    saveCategory(categoryType) {
        const tabId = this.getTabIdFromCategory(categoryType);
        const form = document.getElementById(`${tabId}-form`);

        if (!form || !validateForm(form)) {
            app.showNotification('Please fill in all required fields.', 'warning');
            return;
        }

        let item;
        if (categoryType === 'Currencies') {
            const nameField = document.getElementById('currency-name');
            const symbolField = document.getElementById('currency-symbol');
            const codeField = document.getElementById('currency-code');

            if (!nameField || !symbolField || !codeField) {
                app.showNotification('Form fields not found. Please try again.', 'error');
                return;
            }

            item = {
                'Currency': nameField.value.trim(),
                'Symbol': symbolField.value.trim(),
                'Currency Code': codeField.value.trim().toUpperCase()
            };

            // Validate currency data
            if (!item.Currency || !item.Symbol || !item['Currency Code']) {
                app.showNotification('All currency fields are required.', 'warning');
                return;
            }
        } else {
            const tabId = this.getTabIdFromCategory(categoryType);
            const nameField = document.getElementById(tabId + '-edit');
            if (!nameField) {
                app.showNotification('Form field not found. Please try again.', 'error');
                return;
            }

            item = nameField.value.trim();
            if (!item) {
                app.showNotification('Category name is required.', 'warning');
                return;
            }
        }

        // Check for duplicates
        const categories = dataManager.getData('categories');
        const existingItems = categories[categoryType] || [];

        const isDuplicate = existingItems.some((existingItem, index) => {
            if (index === this.editingIndex) return false; // Skip current item when editing

            if (categoryType === 'Currencies') {
                return existingItem['Currency Code'] === item['Currency Code'] ||
                       existingItem.Symbol === item.Symbol;
            } else {
                return existingItem === item;
            }
        });

        if (isDuplicate) {
            app.showNotification('This item already exists.', 'warning');
            return;
        }

        try {
            if (this.editingIndex >= 0) {
                dataManager.updateCategory(categoryType, this.editingIndex, item);
                app.showNotification('Item updated successfully.', 'success');
            } else {
                dataManager.addCategory(categoryType, item);
                app.showNotification('Item added successfully.', 'success');
            }

            hideModal(`${tabId}-modal`);
            this.renderCategoryContent();
        } catch (error) {
            console.error('Error saving category:', error);
            // Check if it's a validation error with a specific message
            if (error.message && error.message.includes('Cannot save')) {
                app.showNotification(error.message, 'warning');
            } else {
                app.showNotification('Error saving item. Please try again.', 'error');
            }
        }
    }

    deleteCategory(categoryType, index) {
        const categories = dataManager.getData('categories');
        const item = categories[categoryType][index];
        const itemName = typeof item === 'string' ? item : item.Currency || item['Currency'];

        confirmDelete(`Are you sure you want to delete "${itemName}"? It might have been used elsewhere.`, () => {
            dataManager.deleteCategory(categoryType, index);
            this.renderCategoryContent();
            app.showNotification(`"${itemName}" has been deleted successfully.`, 'success');
        });
    }
}

// Initialize categories manager
window.categoriesManager = new CategoriesManager();
