// Transactions Manager
class TransactionsManager {
    constructor() {
        this.currentTab = 'Transactions';
        this.editingIndex = -1;
        this.investmentsPagination = null;
    }

    init() {
        this.setupEventListeners();
        this.populateAccountDropdowns();
        this.refresh();
    }

    getDefaultDateFilter() {
        return {
            type: 'all',
            startDate: null,
            endDate: null
        };
    }

    setupEventListeners() {
        // Add event listeners for tab switches
        document.querySelectorAll('#transactionTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetId = e.target.getAttribute('data-bs-target').substring(1);
                this.currentTab = this.getTabFromId(targetId);

                // Reset pagination when switching tabs
                this.resetPagination();

                this.renderTransactionContent();
            });
        });
    }

    populateAccountDropdowns() {
        const categories = dataManager.getData('categories');
        if (!categories) return;

        // Helper function to combine accounts and debt-payoff without duplicates
        const getCombinedAccounts = () => {
            const accounts = categories.Accounts || [];
            const debtAccounts = categories['Debt Pay-Off'] || [];
            const combined = [...accounts];
            
            // Add debt accounts that aren't already in accounts
            debtAccounts.forEach(debtAccount => {
                if (!accounts.includes(debtAccount)) {
                    combined.push(debtAccount);
                }
            });
            
            return combined.sort();
        };

        // Populate transaction account dropdown (combined accounts + debt-payoff, no duplicates)
        const transactionAccountSelect = document.getElementById('transaction-account');
        if (transactionAccountSelect) {
            const currentValue = transactionAccountSelect.value;
            transactionAccountSelect.innerHTML = '<option value="">Select Account</option>';
            
            const combinedAccounts = getCombinedAccounts();
            combinedAccounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account;
                option.textContent = account;
                transactionAccountSelect.appendChild(option);
            });
            
            if (currentValue) {
                transactionAccountSelect.value = currentValue;
            }
        }

        // Populate debt payment FROM account dropdown (only accounts from categories)
        const debtFromAccountSelect = document.getElementById('debt-from-account');
        if (debtFromAccountSelect && categories.Accounts) {
            const currentValue = debtFromAccountSelect.value;
            debtFromAccountSelect.innerHTML = '<option value="">Select Account</option>';
            categories.Accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account;
                option.textContent = account;
                debtFromAccountSelect.appendChild(option);
            });
            if (currentValue) {
                debtFromAccountSelect.value = currentValue;
            }
        }

        // Populate debt payment TO account dropdown (only debt-payoff from categories)
        const debtToAccountSelect = document.getElementById('debt-to-account');
        if (debtToAccountSelect) {
            const currentValue = debtToAccountSelect.value;
            debtToAccountSelect.innerHTML = '<option value="">Select Debt Account</option>';
            if (categories['Debt Pay-Off']) {
                categories['Debt Pay-Off'].forEach(debtAccount => {
                    const option = document.createElement('option');
                    option.value = debtAccount;
                    option.textContent = debtAccount;
                    debtToAccountSelect.appendChild(option);
                });
            }
            if (currentValue) {
                debtToAccountSelect.value = currentValue;
            }
        }
    
        // Populate investment category dropdown
        const investmentCategorySelect = document.getElementById('investment-type');
        if (investmentCategorySelect && categories.Investments) {
            const currentValue = investmentCategorySelect.value;
            investmentCategorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.Investments.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                investmentCategorySelect.appendChild(option);
            });
            if (currentValue) {
                investmentCategorySelect.value = currentValue;
            }
        }

        // Populate investment account dropdown (combined accounts + debt-payoff, no duplicates)
        const investmentAccountSelect = document.getElementById('investment-account');
        if (investmentAccountSelect) {
            const currentValue = investmentAccountSelect.value;
            investmentAccountSelect.innerHTML = '<option value="">Select Account</option>';
            
            const combinedAccounts = getCombinedAccounts();
            combinedAccounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account;
                option.textContent = account;
                investmentAccountSelect.appendChild(option);
            });
            
            if (currentValue) {
                investmentAccountSelect.value = currentValue;
            }
        }
    }

    refresh() {
        this.renderTransactionContent();
    }



    getTabFromId(tabId) {
        const mapping = {
            'transactions': 'Transactions',
            'debt-payoff': 'Debt Pay-Off',
            'investments': 'Investments',
            'transaction-investments': 'Investments'
        };
        return mapping[tabId] || 'Transactions';
    }

    convertDateForInput(dateString) {
        // Handle different date formats and convert to YYYY-MM-DD for HTML input
        try {
            let date;

            // Check if it's already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                return dateString;
            }

            // Handle DD-MMM-YYYY format (e.g., "02-Aug-2025")
            if (/^\d{2}-\w{3}-\d{4}$/.test(dateString)) {
                const [day, month, year] = dateString.split('-');
                const monthMap = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                return `${year}-${monthMap[month]}-${day.padStart(2, '0')}`;
            }

            // Fallback: try to parse as regular date
            date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }

            // If all else fails, return today's date
            return new Date().toISOString().split('T')[0];
        } catch (error) {
            console.error('Error converting date:', error);
            return new Date().toISOString().split('T')[0];
        }
    }

    convertDateForStorage(dateString) {
        // Convert from YYYY-MM-DD (HTML input) to DD-MMM-YYYY (storage format)
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString; // Return as-is if invalid
            }

            const day = date.getDate().toString().padStart(2, '0');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();

            return `${day}-${month}-${year}`;
        } catch (error) {
            console.error('Error converting date for storage:', error);
            return dateString;
        }
    }

    generatePaginationControls(currentPage, totalPages, type) {
        if (totalPages <= 1) return '';

        let paginationHtml = `
            <nav aria-label="Table pagination" class="mt-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-muted">
                        Page ${currentPage} of ${totalPages}
                    </div>
                    <ul class="pagination pagination-sm mb-0">
        `;

        // Previous button
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="transactionsManager.changePage('${type}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <button class="page-link" onclick="transactionsManager.changePage('${type}', 1)">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button class="page-link" onclick="transactionsManager.changePage('${type}', ${i})">${i}</button>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `
                <li class="page-item">
                    <button class="page-link" onclick="transactionsManager.changePage('${type}', ${totalPages})">${totalPages}</button>
                </li>
            `;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="transactionsManager.changePage('${type}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `;

        paginationHtml += `
                    </ul>
                </div>
            </nav>
        `;

        return paginationHtml;
    }

    changePage(type, newPage) {
        if (type === 'transactions') {
            if (!this.transactionsPagination) {
                this.transactionsPagination = { currentPage: 1, itemsPerPage: 10 };
            }
            this.transactionsPagination.currentPage = newPage;
        } else if (type === 'debt-payoff') {
            if (!this.debtPayoffPagination) {
                this.debtPayoffPagination = { currentPage: 1, itemsPerPage: 10 };
            }
            this.debtPayoffPagination.currentPage = newPage;
        } else if (type === 'investments') {
            if (!this.investmentsPagination) {
                this.investmentsPagination = { currentPage: 1, itemsPerPage: 10 };
            }
            this.investmentsPagination.currentPage = newPage;
        }

        this.renderTransactionContent();
    }

    updateCategoryOptions() {
        const typeSelect = document.getElementById('transaction-type');
        const categorySelect = document.getElementById('transaction-category');
        const categories = dataManager.getData('categories');
        
        if (!typeSelect || !categorySelect || !categories) return;
        
        const selectedType = typeSelect.value;
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        
        if (selectedType && categories[selectedType]) {
            categories[selectedType].forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
    }

    renderTransactionContent() {
        let tabId = this.currentTab.toLowerCase().replace(/\s+/g, '-').replace('pay-off', 'payoff');
        
        // Handle the investments tab ID specifically for transactions page
        if (this.currentTab === 'Investments') {
            tabId = 'transaction-investments';
        }
        
        const listContainer = document.getElementById(`${tabId}-list`);
        const summaryContainer = document.getElementById(`${tabId}-summary`);

        if (!listContainer || !summaryContainer) return;

        let data;
        if (this.currentTab === 'Transactions') {
            data = dataManager.getData('transactions')?.Transactions || [];
        } else if (this.currentTab === 'Investments') {
            data = dataManager.getData('investments')?.Investments || [];
        } else {
            data = dataManager.getData('debtsPayoff')?.['Debt Pay-Off'] || [];
        }

        // Apply date filter with fallback if app is not yet initialized
        const dateFilter = window.app ? app.getCurrentDateFilter() : this.getDefaultDateFilter();
        const filteredData = dataManager.filterByDateRange(data, dateFilter.startDate, dateFilter.endDate);

        // Add original index to filtered data for correct edit/delete operations
        const filteredDataWithIndex = filteredData.map(item => {
            const originalIndex = data.findIndex(originalItem =>
                originalItem['S No'] === item['S No'] &&
                originalItem.Date === item.Date &&
                originalItem.Amount === item.Amount
            );
            return { ...item, _originalIndex: originalIndex };
        });

        // Render list with pagination

        if (this.currentTab === 'Transactions') {
            this.renderTransactionsList(listContainer, filteredDataWithIndex);
        } else if (this.currentTab === 'Investments') {
            this.renderInvestmentsList(listContainer, filteredDataWithIndex);
        } else {
            this.renderDebtPayoffList(listContainer, filteredDataWithIndex);
        }
        
        // Render summary
        this.renderTransactionSummary(summaryContainer, filteredData);
    }

    renderTransactionsList(container, transactions) {
        if (transactions.length === 0) {
            container.innerHTML = '<p class="text-muted">No transactions found for the selected period.</p>';
            return;
        }

        // Initialize pagination if not exists
        if (!this.transactionsPagination) {
            this.transactionsPagination = { currentPage: 1, itemsPerPage: 10 };
        }

        const { currentPage, itemsPerPage } = this.transactionsPagination;
        const totalPages = Math.ceil(transactions.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedTransactions = transactions.slice(startIndex, endIndex);

        const table = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>S No</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Account</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedTransactions.map((transaction) => `
                        <tr>
                            <td>${transaction['S No']}</td>
                            <td>${dataManager.formatDate(transaction.Date)}</td>
                            <td>
                                <span class="badge ${(transaction.Type || transaction['Income/Expenses']) === 'Income' ? 'bg-success' : 'bg-danger'}">
                                    ${transaction.Type || transaction['Income/Expenses']}
                                </span>
                            </td>
                            <td>${transaction['Income/Expenses/SubCategory']}</td>
                            <td class="${(transaction.Type || transaction['Income/Expenses']) === 'Income' ? 'status-positive' : 'status-negative'}">
                                ${dataManager.formatCurrency(transaction.Amount)}
                            </td>
                            <td>${transaction.Account}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="transactionsManager.editTransaction('Transactions', ${transaction._originalIndex})">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="transactionsManager.deleteTransaction('Transactions', ${transaction._originalIndex})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Add pagination controls if needed
        if (totalPages > 1) {
            const paginationHtml = this.generatePaginationControls(currentPage, totalPages, 'transactions');
            container.innerHTML = table + paginationHtml;
        } else {
            container.innerHTML = table;
        }
    }

    renderDebtPayoffList(container, payments) {
        if (payments.length === 0) {
            container.innerHTML = '<p class="text-muted">No debt payments found for the selected period.</p>';
            return;
        }

        // Initialize pagination if not exists
        if (!this.debtPayoffPagination) {
            this.debtPayoffPagination = { currentPage: 1, itemsPerPage: 10 };
        }

        const { currentPage, itemsPerPage } = this.debtPayoffPagination;
        const totalPages = Math.ceil(payments.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedPayments = payments.slice(startIndex, endIndex);

        const table = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>S No</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>From Account</th>
                        <th>To Account</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedPayments.map((payment) => `
                        <tr>
                            <td>${payment['S No']}</td>
                            <td>${dataManager.formatDate(payment.Date)}</td>
                            <td class="status-negative">${dataManager.formatCurrency(payment.Amount)}</td>
                            <td>${payment['From Account']}</td>
                            <td>${payment['To Account']}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="transactionsManager.editTransaction('Debt Pay-Off', ${payment._originalIndex})">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="transactionsManager.deleteTransaction('Debt Pay-Off', ${payment._originalIndex})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Add pagination controls if needed
        if (totalPages > 1) {
            const paginationHtml = this.generatePaginationControls(currentPage, totalPages, 'debt-payoff');
            container.innerHTML = table + paginationHtml;
        } else {
            container.innerHTML = table;
        }
    }

    renderInvestmentsList(container, investments) {
        if (investments.length === 0) {
            container.innerHTML = '<p class="text-muted">No investments found for the selected period.</p>';
            return;
        }

        // Initialize pagination if not exists
        if (!this.investmentsPagination) {
            this.investmentsPagination = { currentPage: 1, itemsPerPage: 10 };
        }

        const { currentPage, itemsPerPage } = this.investmentsPagination;
        const totalPages = Math.ceil(investments.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedInvestments = investments.slice(startIndex, endIndex);

        const table = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>S No</th>
                        <th>Date</th>
                        <th>Investment Type</th>
                        <th>Amount</th>
                        <th>From Account</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedInvestments.map((investment) => `
                        <tr>
                            <td>${investment['S No']}</td>
                            <td>${dataManager.formatDate(investment.Date)}</td>
                            <td>
                                <span class="badge bg-info">
                                    ${investment['Investment Type']}
                                </span>
                            </td>
                            <td class="status-negative">
                                ${dataManager.formatCurrency(investment.Amount)}
                            </td>
                            <td>${investment['From Account']}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="transactionsManager.editTransaction('Investments', ${investment._originalIndex})">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="transactionsManager.deleteTransaction('Investments', ${investment._originalIndex})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Add pagination controls if needed
        if (totalPages > 1) {
            const paginationHtml = this.generatePaginationControls(currentPage, totalPages, 'investments');
            container.innerHTML = table + paginationHtml;
        } else {
            container.innerHTML = table;
        }
    }

    renderTransactionSummary(container, data) {
        if (this.currentTab === 'Transactions') {
            const totalIncome = data.filter(t => (t.Type || t['Income/Expenses']) === 'Income')
                                  .reduce((sum, t) => sum + parseFloat(t.Amount || 0), 0);
            const totalExpenses = data.filter(t => (t.Type || t['Income/Expenses']) === 'Expenses')
                                     .reduce((sum, t) => sum + parseFloat(t.Amount || 0), 0);
            const netAmount = totalIncome - totalExpenses;

            // Group by Type
            const byType = data.reduce((acc, t) => {
                const type = (t.Type || t['Income/Expenses']) || 'Other';
                if (!acc[type]) acc[type] = { count: 0, amount: 0 };
                acc[type].count += 1;
                acc[type].amount += parseFloat(t.Amount || 0);
                return acc;
            }, {});
            const typeEntries = Object.entries(byType).sort((a, b) => Math.abs(b[1].amount) - Math.abs(a[1].amount));

            container.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span>Total Transactions:</span>
                    <span class="badge bg-primary fs-6">${data.length}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span>Total Income:</span>
                    <span class="status-positive">${dataManager.formatCurrency(totalIncome)}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span>Total Expenses:</span>
                    <span class="status-negative">${dataManager.formatCurrency(totalExpenses)}</span>
                </div>
                <hr>
                <div class="mb-2"><strong>By Type</strong></div>
                <div class="list-group mb-3">
                    ${typeEntries.map(([type, info]) => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <span>${type} <span class="badge bg-light text-dark ms-2">${info.count}</span></span>
                            <span class="${type === 'Income' ? 'status-positive' : 'status-negative'}">${dataManager.formatCurrency(info.amount)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span><strong>Net Amount:</strong></span>
                    <span class="fw-bold ${netAmount >= 0 ? 'status-positive' : 'status-negative'}">
                        ${dataManager.formatCurrency(netAmount)}
                    </span>
                </div>
            `;
        } else if (this.currentTab === 'Debt Pay-Off') {
            const totalPayments = data.reduce((sum, p) => sum + parseFloat(p.Amount || 0), 0);
            // Group by To Account
            const byToAccount = data.reduce((acc, p) => {
                const to = p['To Account'] || 'Unknown';
                if (!acc[to]) acc[to] = { count: 0, amount: 0 };
                acc[to].count += 1;
                acc[to].amount += parseFloat(p.Amount || 0);
                return acc;
            }, {});
            const toEntries = Object.entries(byToAccount).sort((a, b) => Math.abs(b[1].amount) - Math.abs(a[1].amount));

            container.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span>Total Payments:</span>
                    <span class="badge bg-primary fs-6">${data.length}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span>Total Amount:</span>
                    <span class="fw-bold status-negative">${dataManager.formatCurrency(totalPayments)}</span>
                </div>
                <hr>
                <div class="mb-2"><strong>By To Account</strong></div>
                <div class="list-group">
                    ${toEntries.map(([to, info]) => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <span>${to} <span class="badge bg-light text-dark ms-2">${info.count}</span></span>
                            <span class="status-negative">${dataManager.formatCurrency(info.amount)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else { // Investments
            const totalInvested = data.reduce((sum, i) => sum + parseFloat(i.Amount || 0), 0);
            // Group by Investment Type
            const byType = data.reduce((acc, i) => {
                const typ = i['Investment Type'] || 'Other';
                if (!acc[typ]) acc[typ] = { count: 0, amount: 0 };
                acc[typ].count += 1;
                acc[typ].amount += parseFloat(i.Amount || 0);
                return acc;
            }, {});
            const typeEntries = Object.entries(byType).sort((a, b) => Math.abs(b[1].amount) - Math.abs(a[1].amount));

            container.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span>Total Investments:</span>
                    <span class="badge bg-primary fs-6">${data.length}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span>Total Amount:</span>
                    <span class="fw-bold status-negative">${dataManager.formatCurrency(totalInvested)}</span>
                </div>
                <hr>
                <div class="mb-2"><strong>By Investment Type</strong></div>
                <div class="list-group">
                    ${typeEntries.map(([typ, info]) => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <span>${typ} <span class="badge bg-light text-dark ms-2">${info.count}</span></span>
                            <span class="status-negative">${dataManager.formatCurrency(info.amount)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    showAddModal(tab) {
        this.editingIndex = -1;
        let tabId = tab.toLowerCase().replace(/\s+/g, '-').replace('pay-off', 'payoff');
        
        // Handle the investments tab ID specifically for transactions page
        if (tab === 'Investments') {
            tabId = 'transaction-investments';
        }
        
        if (window.DEBUG) console.log('showAddModal - tab:', tab, 'tabId:', tabId);
        const title = document.getElementById(`${tabId}-modal-title`);
        const form = document.getElementById(`${tabId}-form`);
        if (window.DEBUG) console.log('Modal elements found:', { title: !!title, form: !!form });

        if (title) {
            let titleText = 'Add ';
            if (tab === 'Transactions') {
                titleText += 'Transaction';
            } else if (tab === 'Investments') {
                titleText += 'Investment';
            } else {
                titleText += 'Payment';
            }
            title.textContent = titleText;
        }

        if (form) {
            clearForm(form);
        }

        // Refresh dropdowns to ensure latest categories are loaded
        this.populateAccountDropdowns();

        // Set default date to planning start date (not today)
        const range = dataManager.getPlanningDateRange();
        const defaultDate = range ? range.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        if (tab === 'Transactions') {
            const dateInput = document.getElementById('transaction-date');
            if (dateInput) dateInput.value = defaultDate;
        } else if (tab === 'Investments') {
            const dateInput = document.getElementById('investment-date');
            if (dateInput) dateInput.value = defaultDate;
        } else {
            const dateInput = document.getElementById('debt-date');
            if (dateInput) dateInput.value = defaultDate;
        }
        showModal(`${tabId}-modal`);
    }

    editTransaction(tab, index) {
        this.editingIndex = index;
        let item;

        if (tab === 'Transactions') {
            const transactions = dataManager.getData('transactions')?.Transactions || [];
            item = transactions[index];
        } else if (tab === 'Investments') {
            const investments = dataManager.getData('investments')?.Investments || [];
            item = investments[index];
        } else {
            const debts = dataManager.getData('debtsPayoff')?.['Debt Pay-Off'] || [];
            item = debts[index];
        }

        let tabId = tab.toLowerCase().replace(/\s+/g, '-').replace('pay-off', 'payoff');
        
        // Handle the investments tab ID specifically for transactions page
        if (tab === 'Investments') {
            tabId = 'transaction-investments';
        }
        
        const title = document.getElementById(`${tabId}-modal-title`);

        let titleText = 'Edit ';
        if (tab === 'Transactions') {
            titleText += 'Transaction';
        } else if (tab === 'Investments') {
            titleText += 'Investment';
        } else {
            titleText += 'Payment';
        }
        title.textContent = titleText;

        // Refresh dropdowns to ensure latest categories are loaded
        this.populateAccountDropdowns();

        if (tab === 'Transactions') {
            document.getElementById('transaction-date').value = this.convertDateForInput(item.Date);
            document.getElementById('transaction-amount').value = item.Amount;
            document.getElementById('transaction-type').value = item['Income/Expenses'] || item.Type;
            this.updateCategoryOptions();
            document.getElementById('transaction-category').value = item['Income/Expenses/SubCategory'];
            document.getElementById('transaction-account').value = item.Account;
        } else if (tab === 'Investments') {
            document.getElementById('investment-date').value = this.convertDateForInput(item.Date);
            document.getElementById('investment-amount').value = item.Amount;
            document.getElementById('investment-type').value = item['Investment Type'];
            document.getElementById('investment-account').value = item['From Account'] || item.Account;
            document.getElementById('investment-description').value = item.Description || '';
            this.populateInvestmentCategories();
        } else {
            document.getElementById('debt-date').value = this.convertDateForInput(item.Date);
            document.getElementById('debt-amount').value = item.Amount;
            document.getElementById('debt-from-account').value = item['From Account'];
            document.getElementById('debt-to-account').value = item['To Account'];
        }

        showModal(`${tabId}-modal`);
    }

    saveTransaction(tab) {
        let tabId = tab.toLowerCase().replace(/\s+/g, '-').replace('pay-off', 'payoff');
        
        // Handle the investments tab ID specifically for transactions page
        if (tab === 'Investments') {
            tabId = 'transaction-investments';
        }
        
        const form = document.getElementById(`${tabId}-form`);
        
        if (!validateForm(form)) {
            return;
        }
        
        let item;
        if (tab === 'Transactions') {
            item = {
                Date: this.convertDateForStorage(document.getElementById('transaction-date').value),
                Amount: parseFloat(document.getElementById('transaction-amount').value),
                Type: document.getElementById('transaction-type').value,
                'Income/Expenses': document.getElementById('transaction-type').value, // Keep for compatibility
                'Income/Expenses/SubCategory': document.getElementById('transaction-category').value,
                Account: document.getElementById('transaction-account').value,
                Description: document.getElementById('transaction-description')?.value || ''
            };
        } else if (tab === 'Investments') {
            item = {
                Date: this.convertDateForStorage(document.getElementById('investment-date').value),
                Amount: parseFloat(document.getElementById('investment-amount').value),
                'Investment Type': document.getElementById('investment-type').value,
                'From Account': document.getElementById('investment-account').value,
                Description: document.getElementById('investment-description')?.value || ''
            };
        } else {
            item = {
                Date: this.convertDateForStorage(document.getElementById('debt-date').value),
                Amount: parseFloat(document.getElementById('debt-amount').value),
                'From Account': document.getElementById('debt-from-account').value,
                'To Account': document.getElementById('debt-to-account').value,
                Description: document.getElementById('debt-description')?.value || ''
            };
        }
        
        if (this.editingIndex >= 0) {
            if (tab === 'Transactions') {
                dataManager.updateTransaction(this.editingIndex, item);
            } else if (tab === 'Investments') {
                dataManager.updateInvestment(this.editingIndex, item);
            } else {
                dataManager.updateDebtPayoff(this.editingIndex, item);
            }
        } else {
            if (tab === 'Transactions') {
                dataManager.addTransaction(item);
            } else if (tab === 'Investments') {
                dataManager.addInvestment(item);
            } else {
                dataManager.addDebtPayoff(item);
            }
        }
        
        hideModal(`${tabId}-modal`);

        // Reset pagination to show the new/updated item
        this.resetPagination();

        this.renderTransactionContent();
    }

    deleteTransaction(tab, index) {
        let itemType;
        if (tab === 'Transactions') {
            itemType = 'transaction';
        } else if (tab === 'Investments') {
            itemType = 'investment';
        } else {
            itemType = 'debt payment';
        }

        confirmDelete(`Are you sure you want to delete this ${itemType}?`, () => {
            if (tab === 'Transactions') {
                dataManager.deleteTransaction(index);
            } else if (tab === 'Investments') {
                dataManager.deleteInvestment(index);
            } else {
                dataManager.deleteDebtPayoff(index);
            }

            // Reset pagination after deletion to avoid empty pages
            this.resetPagination();

            this.renderTransactionContent();
        });
    }

    populateInvestmentCategories() {
        const categories = dataManager.getData('categories');
        if (!categories) return;

        const investmentCategorySelect = document.getElementById('investment-category');
        if (investmentCategorySelect && categories.Investments) {
            investmentCategorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.Investments.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                investmentCategorySelect.appendChild(option);
            });
        }
    }

    resetPagination() {
        // Reset pagination to page 1 for all tabs when filters change
        if (this.transactionsPagination) {
            this.transactionsPagination.currentPage = 1;
        }
        if (this.debtPayoffPagination) {
            this.debtPayoffPagination.currentPage = 1;
        }
        if (this.investmentsPagination) {
            this.investmentsPagination.currentPage = 1;
        }
    }
}

// Initialize transactions manager
window.transactionsManager = new TransactionsManager();
