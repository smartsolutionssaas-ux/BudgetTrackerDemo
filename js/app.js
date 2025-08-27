// Main Application Controller
class FinancialApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.dateFilter = {
            type: 'all',
            startDate: null,
            endDate: null
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDateFilter();

        // Show dashboard first, then initialize pages to avoid circular dependencies
        this.showPage('dashboard');
        
        // Initialize all pages with a small delay to ensure DOM is ready
        setTimeout(() => {
            this.initializeAllPages();
        }, 50);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('[data-page]').dataset.page;
                this.showPage(page);       
            });
        });

        // Date filter
        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.handleDateFilterChange(e.target.value);
        });

        // Custom date range inputs
        document.getElementById('startDate').addEventListener('change', () => {
            this.updateCustomDateRange();
        });

        document.getElementById('endDate').addEventListener('change', () => {
            this.updateCustomDateRange();
        });

        // Listen for data changes
        document.addEventListener('dataChanged', (e) => {
            this.handleDataChange(e.detail);
        });

        // Listen for initial data load
        document.addEventListener('dataLoaded', () => {
            // Re-initialize all pages to ensure they have the data
            this.initializeAllPages();
            // Refresh the current page
            setTimeout(() => {
                this.refreshCurrentPage();
            }, 100);
            // Update storage label on load
            this.updateStorageLabel();

            // If data is empty, land on Help page for guidance
            try {
                const cats = dataManager.getData('categories');
                const planner = dataManager.getData('planner');
                const tx = dataManager.getData('transactions');
                const debts = dataManager.getData('debtsPayoff');
                const inv = dataManager.getData('investments');
                const noPlannerStart = !planner || !planner['Start Date'];
                const noTx = !tx || !Array.isArray(tx.Transactions) || tx.Transactions.length === 0;
                const noDebts = !debts || !Array.isArray(debts['Debt Pay-Off']) || debts['Debt Pay-Off'].length === 0;
                const noInv = !inv || !Array.isArray(inv.Investments) || inv.Investments.length === 0;
                const hasCategories = !!(cats && (cats.Accounts || cats['Income'] || cats['Expenses'] || cats['Debt Pay-Off']));

                const isEmpty = noPlannerStart && noTx && noDebts && noInv && !hasCategories;
                if (isEmpty) {
                    this.showPage('help');
                }
            } catch (e) {
                // noop
            }
        });
    }

    setupDateFilter() {
        // Set default to "all" - no date filtering
        this.dateFilter.type = 'all';
        this.dateFilter.startDate = null;
        this.dateFilter.endDate = null;

        // Set the dropdown to "all"
        document.getElementById('dateFilter').value = 'all';

        // Hide custom date range initially
        document.getElementById('customDateRange').classList.add('d-none');
    }

    handleDateFilterChange(filterType) {
        // Only apply date filter on transactions page
        if (this.currentPage !== 'transactions') {
            return;
        }

        this.dateFilter.type = filterType;

        if (filterType === 'custom') {
            document.getElementById('customDateRange').classList.remove('d-none');
        } else {
            document.getElementById('customDateRange').classList.add('d-none');

            if (filterType === 'all') {
                // No date filtering - show all data
                this.dateFilter.startDate = null;
                this.dateFilter.endDate = null;
            } else {
                // Apply specific date range
                const dateRange = dataManager.getDateRange(filterType);
                this.dateFilter.startDate = dateRange.start;
                this.dateFilter.endDate = dateRange.end;
            }

            // Update input values for display
            document.getElementById('startDate').value = this.formatDateForInput(this.dateFilter.startDate);
            document.getElementById('endDate').value = this.formatDateForInput(this.dateFilter.endDate);
        }

        // Reset pagination when filter changes
        if (window.transactionsManager) {
            window.transactionsManager.resetPagination();
        }

        // Only refresh transactions page
        if (window.transactionsManager) {
            transactionsManager.refresh();
        }
    }

    updateCustomDateRange() {
        // Only apply date filter on transactions page
        if (this.currentPage !== 'transactions') {
            return;
        }

        if (this.dateFilter.type === 'custom') {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            if (startDate && endDate) {
                this.dateFilter.startDate = new Date(startDate);
                this.dateFilter.endDate = new Date(endDate);

                // Reset pagination when custom date range changes
                if (window.transactionsManager) {
                    window.transactionsManager.resetPagination();
                }

                // Only refresh transactions page
                if (window.transactionsManager) {
                    transactionsManager.refresh();
                }
            }
        }
    }

    formatDateForInput(date) {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    }

    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.add('d-none');
        });

        // Show selected page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.remove('d-none');
            targetPage.classList.add('fade-in');
        }

        // Update navigation
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentPage = pageName;

        this.refreshCurrentPage();

        // Setup date validation after page content is loaded
        setTimeout(() => {
            setupDateValidation();
        }, 200);

        // Update Back-to-Top visibility when changing pages
        if (typeof updateBackToTopButton === 'function') {
            updateBackToTopButton();
        }
    }



    refreshCurrentPage() {
        // Add a small delay to ensure all managers are initialized
        setTimeout(() => {
            switch (this.currentPage) {
                case 'dashboard':
                    if (window.dashboardManager) {
                        dashboardManager.init();
                        dashboardManager.refresh();
                    }
                    break;
                case 'categories':
                    if (window.categoriesManager) {
                        categoriesManager.refresh();
                    }
                    break;
                case 'settings':
                    if (window.settingsManager) {
                        settingsManager.init();
                        settingsManager.refresh();
                    }
                    break;
                case 'planner':
                    if (window.plannerManager) {
                        plannerManager.refresh();
                    }
                    break;
                case 'transactions':
                    if (window.transactionsManager) {
                        transactionsManager.refresh();
                    }
                    break;

            }
        }, 100);
    }



    initializeAllPages() {
        // Initialize all page managers with error handling
        try {
            if (window.dashboardManager) {
                dashboardManager.init();
            }
            if (window.categoriesManager) {
                categoriesManager.init();
            }
            if (window.plannerManager) {
                plannerManager.init();
            }
            if (window.transactionsManager) {
                transactionsManager.init();
            }
        } catch (error) {
            console.error('Error initializing page managers:', error);
        }
    }

    handleDataChange() {
        // Refresh current page when data changes
        this.refreshCurrentPage();
        
        // Show success notification
        this.showNotification('Data updated successfully', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 90px; right: 20px; z-index: 1050; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Utility methods
    getCurrentDateFilter() {
        return this.dateFilter;
    }

    get currentDateFilter() {
        return {
            start: this.dateFilter.startDate ? this.formatDateForInput(this.dateFilter.startDate) : '',
            end: this.dateFilter.endDate ? this.formatDateForInput(this.dateFilter.endDate) : '',
            type: this.dateFilter.type
        };
    }

    formatCurrency(amount, currencyCode) {
        return dataManager.formatCurrency(amount, currencyCode);
    }

    formatDate(dateString) {
        return dataManager.formatDate(dateString);
    }

    async updateStorageLabel() {
        const labelEl = document.getElementById('data-storage-label');
        if (!labelEl || !window.dataManager) return;
        try {
            // Pure demo mode label
            labelEl.textContent = 'Demo';
            labelEl.classList.remove('text-success');
            labelEl.classList.add('text-dark');
            labelEl.classList.add('bg-warning');
            labelEl.classList.remove('bg-light');
        } catch {
            labelEl.textContent = 'In-Memory';
            labelEl.classList.remove('text-success');
            labelEl.classList.add('text-dark');
        }
    }
}

// Global utility functions
function showModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function hideModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) {
        modal.hide();
    }
}

function confirmDelete(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    return isValid;
}

function clearForm(formElement) {
    const inputs = formElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        } else {
            input.value = '';
        }
        input.classList.remove('is-invalid', 'is-valid');
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create app instance and make it globally available
    window.app = new FinancialApp();

    // Pure Demo Mode: preload sample data automatically on startup
    (async () => {
        try {
            if (window.dataManager && typeof dataManager.populateFromSample === 'function') {
                await dataManager.populateFromSample();
            }
            // Refresh storage badge to reflect Demo session
            if (window.app && typeof app.updateStorageLabel === 'function') {
                await app.updateStorageLabel();
            }
        } catch (e) {
            console.error('Failed to auto-populate sample data on startup', e);
        }
    })();

    // Wire storage connect button and initial label
    const connectBtn = document.getElementById('connect-data-folder-btn');
    const labelEl = document.getElementById('data-storage-label');
    const populateBtn = document.getElementById('populate-sample-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            try {
                await dataManager.connectDataFolder();
                await app.updateStorageLabel();
                app.showNotification('Storage connected. Data loaded from folder if available.', 'success');
            } catch (e) {
                console.error(e);
                app.showNotification('Failed to connect folder. Use a supported browser like Chrome/Edge.', 'warning');
            }
        });
    }
    if (labelEl && app && typeof app.updateStorageLabel === 'function') {
        app.updateStorageLabel();
    }

    // Wire populate sample data button
    if (populateBtn) {
        populateBtn.addEventListener('click', async () => {
            try {
                await dataManager.populateFromSample();
                // Refresh storage badge to reflect in-memory after sample populate
                if (app && typeof app.updateStorageLabel === 'function') {
                    await app.updateStorageLabel();
                }
                app.showNotification('Sample data populated. Switched to In-Memory storage for this session.', 'success');
            } catch (e) {
                console.error(e);
                app.showNotification('Failed to populate sample data. Ensure sampledata scripts are loaded.', 'danger');
            }
        });
    }

    // Wire global handlers for Export/Import buttons
    window.handleExportClick = function() {
        try {
            dataManager.exportWorkbook();
            app.showNotification('Export started. Your workbook will download shortly.', 'info');
        } catch (e) {
            console.error(e);
            app.showNotification('Export failed. See console for details.', 'danger');
        }
    };

    window.handleImportClick = function() {
        const input = document.getElementById('importWorkbookInput');
        if (input) input.click();
    };

    window.handleImportFileChange = async function(event) {
        const file = event?.target?.files?.[0];
        if (!file) return;
        try {
            app.showNotification('Importing workbook... This will replace existing data.', 'warning');
            await dataManager.importWorkbookFromFile(file);
            // Clear file input value so selecting the same file again triggers change
            event.target.value = '';
            app.showNotification('Import complete. Data reloaded from workbook.', 'success');
            // Refresh all pages
            if (window.dashboardManager) dashboardManager.refresh();
            if (window.categoriesManager) categoriesManager.refresh();
            if (window.plannerManager) plannerManager.refresh();
            if (window.transactionsManager) transactionsManager.refresh();
        } catch (e) {
            console.error(e);
            app.showNotification('Import failed. Ensure the workbook format is correct.', 'danger');
        }
    };

    // Clear All (keep categories)
    window.handleClearAllKeepCategories = function() {
        confirmDelete('This will clear planner items, transactions, debt pay-offs, and investments. Categories will be retained. Continue?', async () => {
            try {
                const emptyPlanner = {
                    'Start Date': '',
                    'Currency': '',
                    'Current Holding': [],
                    'Current Outstanding': [],
                    'Expected Income': [],
                    'Planned Expenses': [],
                    'Planned Investments': []
                };
                const emptyTransactions = { Transactions: [] };
                const emptyDebts = { 'Debt Pay-Off': [] };
                const emptyInvestments = { Investments: [] };

                await dataManager.saveData('planner', emptyPlanner);
                await dataManager.saveData('transactions', emptyTransactions);
                await dataManager.saveData('debtsPayoff', emptyDebts);
                await dataManager.saveData('investments', emptyInvestments);

                // Reload and notify
                await dataManager.loadFromStorage();
                document.dispatchEvent(new CustomEvent('dataLoaded'));
                document.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: 'all' } }));

                // Refresh pages
                if (window.dashboardManager) dashboardManager.refresh();
                if (window.categoriesManager) categoriesManager.refresh();
                if (window.plannerManager) plannerManager.refresh();
                if (window.transactionsManager) transactionsManager.refresh();

                app.showNotification('Cleared all data except categories.', 'success');
            } catch (e) {
                console.error(e);
                app.showNotification('Clear failed. See console for details.', 'danger');
            }
        });
    };

    // Theme handling
    function applyTheme(theme) {
        // Remove previous theme classes
        document.body.classList.remove('theme-emerald', 'theme-sunset', 'theme-slate');
        if (theme && theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }
        // Persist
        try { localStorage.setItem('financial_theme', theme || 'default'); } catch (_) {}
        // Sync selector if present
        const sel = document.getElementById('themeSelect');
        if (sel && sel.value !== theme) sel.value = theme || 'default';
    }

    // Initialize theme from storage
    (function initTheme() {
        let theme = 'default';
        try { theme = localStorage.getItem('financial_theme') || 'default'; } catch (_) {}
        applyTheme(theme);
        // ensure selector reflects current theme (after DOM ready)
        const sel = document.getElementById('themeSelect');
        if (sel) sel.value = theme;
    })();

    // Expose handler
    window.handleThemeChange = function(value) {
        applyTheme(value);
        app.showNotification(`Theme set to ${value.charAt(0).toUpperCase() + value.slice(1)}`, 'info');
    };

    // Initialize Back-to-Top visibility and scroll binding
    if (typeof updateBackToTopButton === 'function') {
        updateBackToTopButton();
        window.addEventListener('scroll', updateBackToTopButton, { passive: true });
    }
    
    // In pure Demo Mode, ensure no data persists between sessions
    // Clear localStorage on page unload events so every new visit starts fresh
    const clearLocalOnExit = () => {
        try {
            localStorage.clear();
        } catch (_) {}
    };
    // beforeunload for most browsers
    window.addEventListener('beforeunload', clearLocalOnExit);
    // pagehide for Safari/iOS reliability
    window.addEventListener('pagehide', clearLocalOnExit);
});

// Global refresh function for dashboard
function refreshDashboard() {
    if (window.dashboardManager) {
        dashboardManager.refresh();
    }
}

// Global function to update planner settings
function updatePlannerSettings() {
    const startDate = document.getElementById('plannerStartDate').value;
    const currency = document.getElementById('plannerCurrency').value;

    if (window.DEBUG) console.log('Updating planner settings:', { startDate, currency });

    if (startDate && currency) {
        // Get the previous settings to check what changed
        const planner = dataManager.getData('planner');
        const previousCurrency = planner ? planner['Currency'] : null;
        const previousStartDate = planner ? planner['Start Date'] : null;

        // Validate start date change if it's different
        if (previousStartDate && startDate !== previousStartDate) {
            const validation = dataManager.validateStartDateChange(startDate);
            if (!validation.valid) {
                // Show a more user-friendly modal instead of just a notification
                showValidationErrorModal(validation.message);
                return;
            }
        }

        if (window.DEBUG) console.log('Previous currency:', previousCurrency, 'New currency:', currency);

        // Update the settings
        dataManager.updatePlannerSettings(startDate, currency);

        // Always refresh all screens to reflect any changes
        if (window.DEBUG) console.log('Refreshing all managers...');

        // Update currency display across all managers
        if (window.dashboardManager) {
            window.dashboardManager.refresh();
        }
        if (window.transactionManager) {
            window.transactionManager.refresh();
        }
        if (window.transactionsManager) {
            window.transactionsManager.refresh();
        }
        if (window.plannerManager) {
            window.plannerManager.refresh();
        }
        if (window.reportManager) {
            window.reportManager.refresh();
        }

        // Also refresh settings page if it exists
        if (window.settingsManager) {
            window.settingsManager.refresh();
        }

        if (previousCurrency !== currency) {
            app.showNotification(`Currency updated to ${currency} across all screens`, 'success');
        } else {
            app.showNotification('Planner settings updated successfully', 'success');
        }
    } else {
        app.showNotification('Please fill in all required fields', 'warning');
    }
}

// Global date validation function
function validateDateInput(dateInput, showError = true) {
    const dateValue = dateInput.value;
    if (!dateValue) return true; // Allow empty dates

    const range = dataManager.getPlanningDateRange();
    if (!range) {
        if (showError) {
            app.showNotification('Please set a planning start date in Settings first', 'warning');
        }
        return false;
    }

    const inputDate = new Date(dateValue);
    const isValid = inputDate >= range.startDate && inputDate <= range.endDate;

    if (!isValid) {
        if (showError) {
            const startStr = range.startDate.toLocaleDateString();
            const endStr = range.endDate.toLocaleDateString();
            app.showNotification(`Date must be between ${startStr} and ${endStr} (planning period)`, 'warning');
        }

        // Auto-correct the date to be within range
        if (inputDate < range.startDate) {
            dateInput.value = range.startDate.toISOString().split('T')[0];
        } else if (inputDate > range.endDate) {
            dateInput.value = range.endDate.toISOString().split('T')[0];
        }

        if (showError) {
            dateInput.focus();
        }
    }

    return isValid;
}

// Function to setup date validation on all date inputs
function setupDateValidation() {
    document.querySelectorAll('input[type="date"]').forEach(dateInput => {
        // Skip the planning start date input (it has its own validation)
        if (dateInput.id === 'plannerStartDate') return;

        // Set min and max attributes based on planning range
        const range = dataManager.getPlanningDateRange();
        if (range) {
            const minDate = range.startDate.toISOString().split('T')[0];
            const maxDate = range.endDate.toISOString().split('T')[0];

            dateInput.min = minDate;
            dateInput.max = maxDate;



            // Set default date to planning start date if input is empty
            if (!dateInput.value) {
                dateInput.value = range.startDate.toISOString().split('T')[0];
            } else {
                // Validate existing value and correct if outside range
                const currentDate = new Date(dateInput.value);
                if (currentDate < range.startDate) {
                    dateInput.value = range.startDate.toISOString().split('T')[0];
                } else if (currentDate > range.endDate) {
                    dateInput.value = range.endDate.toISOString().split('T')[0];
                }
            }
        }

        // Add event listeners for validation (both change and input for manual typing)
        dateInput.addEventListener('change', function() {
            validateDateInput(this);
        });

        dateInput.addEventListener('input', function() {
            // Validate on input but don't show error immediately (user might still be typing)
            validateDateInput(this, false);
        });

        dateInput.addEventListener('blur', function() {
            // Validate when user leaves the field
            validateDateInput(this, true);
        });

        // Add visual indicator
        const parent = dateInput.parentNode;
        if (!parent.querySelector('.date-range-info')) {
            const info = document.createElement('div');
            info.className = 'date-range-info form-text';
            if (range) {
                info.innerHTML = `<i class="bi bi-calendar-range me-1"></i>Valid range: ${range.startDate.toLocaleDateString()} - ${range.endDate.toLocaleDateString()}`;
            } else {
                info.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Set planning start date in Settings first';
            }
            parent.appendChild(info);
        }
    });
}

// Function to show validation error in a modal
function showValidationErrorModal(message) {
    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="validationErrorModal" tabindex="-1" aria-labelledby="validationErrorModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title" id="validationErrorModalLabel">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>Cannot Change Start Date
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Planning Period Conflict:</strong> The new start date would create a planning period that conflicts with existing records.
                        </div>
                        <div class="mb-3">
                            <h6>Conflicting Records:</h6>
                            <div class="bg-light p-3 rounded" style="max-height: 300px; overflow-y: auto;">
                                <pre class="mb-0 small">${message.replace('Cannot change start date. The following existing records would fall outside the planning period:\n\n', '').replace('\n\nPlease update or remove these records first.', '')}</pre>
                            </div>
                        </div>
                        <div class="alert alert-info mb-0">
                            <i class="bi bi-lightbulb me-2"></i>
                            <strong>Solution:</strong> Please update or remove the conflicting records first, then try changing the start date again.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-lg me-1"></i>Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('validationErrorModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('validationErrorModal'));
    modal.show();

    // Clean up modal after it's hidden
    document.getElementById('validationErrorModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}
