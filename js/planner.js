// Planner Manager
class PlannerManager {
    constructor() {
        this.currentSection = 'Current Holding';
        this.editingIndex = -1;
        this.cachedSettings = null; // Cache settings to ensure persistence
        this.sorting = {}; // { [sectionKey]: { field: 'Frequency', dir: 'asc'|'desc' } }
    }

    init() {
        this.renderPlannerTabs();
        this.refresh();
    }

    refresh() {
        this.renderPlannerContent();
    }





    renderPlannerTabs() {
        const tabContent = document.getElementById('plannerTabContent');
        if (!tabContent) return;

        // Clear existing content
        tabContent.innerHTML = '';

        const sections = ['Current Holding', 'Current Outstanding', 'Expected Income', 'Planned Expenses', 'Planned Investments'];

        sections.forEach((section, index) => {
            const isActive = index === 0 ? 'show active' : '';
            const tabId = section.toLowerCase().replace(/\s+/g, '-');

            const tabPane = document.createElement('div');
            tabPane.className = `tab-pane fade ${isActive}`;
            tabPane.id = tabId;
            tabPane.innerHTML = this.getPlannerTabContent(section);

            tabContent.appendChild(tabPane);
        });

        // Add event listeners for tab switches
        document.querySelectorAll('#plannerTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetId = e.target.getAttribute('data-bs-target').substring(1);
                this.currentSection = this.getSectionFromTabId(targetId);
                this.renderPlannerContent();
            });
        });

        // Ensure the first tab is active and trigger Bootstrap tab
        setTimeout(() => {
            const firstTab = document.querySelector('#plannerTabs button[data-bs-toggle="tab"]');
            if (firstTab) {
                // Make sure the first tab has active class
                document.querySelectorAll('#plannerTabs .nav-link').forEach(link => link.classList.remove('active'));
                firstTab.classList.add('active');

                // Always use manual activation for reliability
                const targetId = firstTab.getAttribute('data-bs-target').substring(1);
                const targetContent = document.getElementById(targetId);
                if (targetContent) {
                    document.querySelectorAll('#plannerTabContent .tab-pane').forEach(pane => {
                        pane.classList.remove('show', 'active');
                    });
                    targetContent.classList.add('show', 'active');
                }
            }
        }, 300);
    }

    getSectionFromTabId(tabId) {
        const mapping = {
            'current-holding': 'Current Holding',
            'current-outstanding': 'Current Outstanding',
            'expected-income': 'Expected Income',
            'planned-expenses': 'Planned Expenses',
            'planned-investments': 'Planned Investments'
        };
        return mapping[tabId] || 'Current Holding';
    }

    getPlannerTabContent(section) {
        const tabId = section.toLowerCase().replace(/\s+/g, '-');
        
        return `
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">${section}</h5>
                            <button class="btn btn-primary btn-sm" onclick="plannerManager.showAddModal('${section}')">
                                <i class="bi bi-plus-lg me-1"></i>Add Item
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="${tabId}-list" class="table-responsive">
                                <!-- Content will be dynamically generated -->
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <!-- Summary -->
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Summary</h5>
                        </div>
                        <div class="card-body">
                            <div id="${tabId}-summary">
                                <!-- Summary will be dynamically generated -->
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
                            <h5 class="modal-title" id="${tabId}-modal-title">Add ${section} Item</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="${tabId}-form">
                                ${this.getPlannerFormFields(section)}
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="plannerManager.savePlannerItem('${section}')">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPlannerFormFields(section) {
        const categories = dataManager.getData('categories');
        const isHolding = section.includes('Holding') || section.includes('Outstanding');
        const tabId = section.toLowerCase().replace(/\s+/g, '-');

        if (isHolding) {
            // Use different categories based on section type
            const isOutstanding = section.includes('Outstanding');
            const accountOptions = isOutstanding ? categories?.['Debt Pay-Off'] : categories?.Accounts;
            const labelText = isOutstanding ? 'Debt Account' : 'Account';
            const placeholderText = isOutstanding ? 'Select Debt Account' : 'Select Account';

            return `
                <div class="mb-3">
                    <label for="${tabId}-account" class="form-label">${labelText}</label>
                    <select class="form-select" id="${tabId}-account" required>
                        <option value="">${placeholderText}</option>
                        ${accountOptions?.map(account => `<option value="${account}">${account}</option>`).join('') || ''}
                    </select>
                </div>
                <div class="mb-3">
                    <label for="${tabId}-amount" class="form-label">Amount</label>
                    <input type="number" class="form-control" id="${tabId}-amount" step="0.01" required>
                </div>
            `;
        } else {
            const isIncome = section.includes('Income');
            const isInvestments = section.includes('Investments');
            let categoryOptions;
            
            if (isIncome) {
                categoryOptions = categories?.Income;
            } else if (isInvestments) {
                categoryOptions = categories?.Investments;
            } else {
                categoryOptions = categories?.Expenses;
            }

            return `
                <div class="mb-3">
                    <label for="${tabId}-subcategory" class="form-label">Sub Category</label>
                    <select class="form-select" id="${tabId}-subcategory" required>
                        <option value="">Select Category</option>
                        ${categoryOptions?.map(cat => `<option value="${cat}">${cat}</option>`).join('') || ''}
                    </select>
                </div>
                <div class="mb-3">
                    <label for="${tabId}-frequency" class="form-label">Frequency</label>
                    <select class="form-select" id="${tabId}-frequency" required>
                        <option value="">Select Frequency</option>
                        ${categories?.Frequencies?.map(freq => `<option value="${freq}">${freq}</option>`).join('') || ''}
                    </select>
                </div>
                <div class="mb-3">
                    <label for="${tabId}-amount" class="form-label">Amount</label>
                    <input type="number" class="form-control" id="${tabId}-amount" step="0.01" required>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="${tabId}-startDate" class="form-label">Start Date</label>
                        <input type="date" class="form-control" id="${tabId}-startDate" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="${tabId}-endDate" class="form-label">End Date</label>
                        <input type="date" class="form-control" id="${tabId}-endDate" required>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="${tabId}-notes" class="form-label">Notes</label>
                    <textarea class="form-control" id="${tabId}-notes" rows="3"></textarea>
                </div>
            `;
        }
    }

    renderPlannerContent() {
        const planner = dataManager.getData('planner');
        if (!planner) return;

        const sectionData = planner[this.currentSection] || [];
        const tabId = this.currentSection.toLowerCase().replace(/\s+/g, '-');
        const listContainer = document.getElementById(`${tabId}-list`);
        const summaryContainer = document.getElementById(`${tabId}-summary`);

        if (!listContainer || !summaryContainer) return;

        // Render list
        this.renderPlannerList(listContainer, sectionData);

        // Render summary
        this.renderPlannerSummary(summaryContainer, sectionData);
    }

    renderPlannerList(container, items) {
        if (items.length === 0) {
            container.innerHTML = `<p class="text-muted">No ${this.currentSection.toLowerCase()} items added yet.</p>`;
            return;
        }

        // Decorate items with original index, then apply sorting on full dataset before pagination
        const sectionKey = this.currentSection.replace(/\s+/g, '');
        const decorated = items.map((it, idx) => ({ ...it, _originalIndex: idx }));
        const sortedItems = this.getSortedItems(decorated, sectionKey);

        // Add pagination if more than 10 items
        if (sortedItems.length > 10) {
            // Initialize pagination if not exists
            if (!this.pagination) {
                this.pagination = {};
            }
            if (!this.pagination[sectionKey]) {
                this.pagination[sectionKey] = { currentPage: 1, itemsPerPage: 10 };
            }

            const { currentPage, itemsPerPage } = this.pagination[sectionKey];
            const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedItems = sortedItems.slice(startIndex, endIndex);

            const isHolding = this.currentSection.includes('Holding') || this.currentSection.includes('Outstanding');

            let tableHtml;
            if (isHolding) {
                tableHtml = this.renderHoldingList(paginatedItems, true);
            } else {
                tableHtml = this.renderIncomeExpenseList(paginatedItems, true);
            }

            // Add pagination controls
            const paginationHtml = this.generatePaginationControls(currentPage, totalPages, sectionKey);
            container.innerHTML = tableHtml + paginationHtml;
        } else {
            // No pagination needed, render all items
            const isHolding = this.currentSection.includes('Holding') || this.currentSection.includes('Outstanding');

            if (isHolding) {
                container.innerHTML = this.renderHoldingList(sortedItems, false);
            } else {
                container.innerHTML = this.renderIncomeExpenseList(sortedItems, false);
            }
        }
    }

    getSortedItems(items, sectionKey) {
        const sort = (this.sorting && this.sorting[sectionKey]) || null;
        if (!sort) return items;
        const dir = sort.dir === 'desc' ? -1 : 1;
        if (sort.field === 'Frequency') {
            return items.sort((a, b) => {
                const fa = (a.Frequency || '').toString().toLowerCase();
                const fb = (b.Frequency || '').toString().toLowerCase();
                if (fa < fb) return -1 * dir;
                if (fa > fb) return 1 * dir;
                return 0;
            });
        }
        return items;
    }

    handleSortClick(field) {
        const sectionKey = this.currentSection.replace(/\s+/g, '');
        const current = this.sorting[sectionKey];
        if (!current || current.field !== field) {
            this.sorting[sectionKey] = { field, dir: 'asc' };
        } else {
            this.sorting[sectionKey].dir = current.dir === 'asc' ? 'desc' : 'asc';
        }
        this.renderPlannerContent();
    }

    renderHoldingList(items, isPaginated = false) {
        return `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Account</th>
                        <th>Amount</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, index) => {
                        const actualIndex = (item && item._originalIndex !== undefined) ? item._originalIndex : index;
                        return `
                        <tr>
                            <td>${item.Account}</td>
                            <td>${dataManager.formatCurrency(item.Amount)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="plannerManager.editPlannerItem('${this.currentSection}', ${actualIndex})">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="plannerManager.deletePlannerItem('${this.currentSection}', ${actualIndex})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    renderIncomeExpenseList(items, isPaginated = false) {
        const range = dataManager.getPlanningDateRange();
        const sectionKey = this.currentSection.replace(/\s+/g, '');
        const sort = this.sorting[sectionKey];
        const freqArrow = sort && sort.field === 'Frequency' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
        return `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th role="button" onclick="plannerManager.handleSortClick('Frequency')" title="Sort by Frequency">Frequency${freqArrow}</th>
                        <th>Amount</th>
                        <th>Period</th>
                        <th title="Number of occurrences within current period">Occurrences</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, index) => {
                        const actualIndex = (item && item._originalIndex !== undefined) ? item._originalIndex : index;
                        const occ = this.countFrequencyOccurrencesInPeriod(item, range);
                        const occDisplay = Math.round(occ || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
                        return `
                        <tr>
                            <td>${item['Sub Category'] || item['Sub-Category']}</td>
                            <td><span class="badge bg-info">${item.Frequency}</span></td>
                            <td>${dataManager.formatCurrency(item.Amount)}</td>
                            <td>${dataManager.formatDate(item['Start Date'])} - ${dataManager.formatDate(item['End Date'])}</td>
                            <td>${occDisplay}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="plannerManager.editPlannerItem('${this.currentSection}', ${actualIndex})">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="plannerManager.deletePlannerItem('${this.currentSection}', ${actualIndex})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    renderPlannerSummary(container, items) {
        const total = items.reduce((sum, item) => sum + parseFloat(item.Amount || 0), 0);
        const count = items.length;

        // For Income/Expenses/Investments, compute frequency-aware summaries
        const isHolding = this.currentSection.includes('Holding') || this.currentSection.includes('Outstanding');
        let monthlyPlanned = 0;
        let annualPlanned = 0;
        let periodPlanned = 0;

        if (!isHolding) {
            const range = dataManager.getPlanningDateRange();
            // Period total (prorated by exact overlapping days per month)
            periodPlanned = this.calculatePeriodPlanned(items, range);
        }

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span>Total Items:</span>
                <span class="badge bg-primary fs-6">${count}</span>
            </div>
            <hr>
            ${isHolding ? `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span>Total Amount:</span>
                <span class="fw-bold text-info">${dataManager.formatCurrency(total)}</span>
            </div>
            ` : `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span>Total Planned (Current Period):</span>
                <span class="fw-bold text-info">${dataManager.formatCurrency(periodPlanned)}</span>
            </div>
            `}
            ${this.getAdditionalSummaryInfo(items)}
        `;
    }

    // Monthly equivalent for an item (full month value) independent of dates
    getMonthlyEquivalentForItem(item) {
        const amount = parseFloat(item.Amount || 0);
        const frequency = (item.Frequency || '').toLowerCase();
        if (frequency.includes('weekly')) return amount * 4.33; // average weeks per month
        if (frequency.includes('bi-weekly')) return amount * 2.17; // average bi-weekly per month
        if (frequency.includes('monthly')) return amount;
        if (frequency.includes('quarterly')) return amount / 3;
        if (frequency.includes('yearly') || frequency.includes('annually')) return amount / 12;
        // default assume monthly
        return amount;
    }

    // Normalize date (avoid DST issues) and clamp time
    normalizeDate(d) { const nd = new Date(d); nd.setHours(12,0,0,0); return nd; }

    // Get month window [monthStart, monthEnd]
    getMonthWindow(anyDate) {
        const d = this.normalizeDate(anyDate);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12, 0, 0, 0);
        return { monthStart, monthEnd };
    }

    // Inclusive day count between two normalized dates
    daysInclusive(a, b) {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.max(0, Math.floor((this.normalizeDate(b) - this.normalizeDate(a)) / msPerDay) + 1);
    }

    // Prorated total for a specific month based on overlap days
    calculateMonthProratedTotal(items, anyDateInMonth) {
        const { monthStart, monthEnd } = this.getMonthWindow(anyDateInMonth);
        const daysInMonth = this.daysInclusive(monthStart, monthEnd);
        let total = 0;
        items.forEach(item => {
            try {
                const itemStart = this.normalizeDate(new Date(item['Start Date']));
                const itemEnd = this.normalizeDate(new Date(item['End Date']));
                // overlap window
                const start = itemStart > monthStart ? itemStart : monthStart;
                const end = itemEnd < monthEnd ? itemEnd : monthEnd;
                if (end >= start) {
                    const overlapDays = this.daysInclusive(start, end);
                    const monthlyEq = this.getMonthlyEquivalentForItem(item);
                    total += monthlyEq * (overlapDays / daysInMonth);
                }
            } catch (e) {
                // ignore item-level errors for monthly calc
            }
        });
        return total;
    }

    // Sum planned amounts over planning date range using occurrences * amount per item
    calculatePeriodPlanned(items, range) {
        try {
            // If no planning range, safely return 0
            if (!range || !range.startDate || !range.endDate) {
                return 0;
            }
            const planStart = this.normalizeDate(range.startDate);
            const planEnd = this.normalizeDate(range.endDate);
            let total = 0;

            for (const item of items) {
                try {
                    const itemStart = this.normalizeDate(new Date(item['Start Date']));
                    const itemEnd = this.normalizeDate(new Date(item['End Date']));
                    const s = itemStart > planStart ? itemStart : planStart;
                    const e = itemEnd < planEnd ? itemEnd : planEnd;
                    if (e < s) continue;
                    const occ = this.periodCount((item.Frequency || '').toLowerCase(), s, e) || 0;
                    const amt = parseFloat(item.Amount || 0) || 0;
                    total += occ * amt;
                } catch {}
            }

            return total;
        } catch (e) {
            console.warn('calculatePeriodPlanned error', e);
            return 0;
        }
    }

    getAdditionalSummaryInfo(items) {
        if (this.currentSection.includes('Holding') || this.currentSection.includes('Outstanding')) {
            return '';
        }
        
        const range = dataManager.getPlanningDateRange();
        // If no range yet, avoid rendering additional summary
        if (!range || !range.startDate || !range.endDate) {
            return '';
        }
        const frequencies = {}; // item count per frequency
        const freqPeriodTotals = {}; // period-adjusted totals per frequency
        items.forEach(item => {
            const freq = item.Frequency;
            frequencies[freq] = (frequencies[freq] || 0) + 1;
            const periodTotal = this.calculatePeriodPlanned([item], range);
            freqPeriodTotals[freq] = (freqPeriodTotals[freq] || 0) + periodTotal;
        });
        
        return `
            <hr>
            <h6>By Frequency:</h6>
            ${Object.entries(frequencies).map(([freq, count]) => `
                <div class="d-flex align-items-center mb-2">
                    <span class="me-2" style="width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${freq}:</span>
                    <span class="badge bg-secondary" style="min-width: 40px; text-align: left;" title="Number of items with this frequency">${count}</span>
                    <span class="fw-bold ms-auto text-end" style="min-width: 160px;" title="Total for this frequency over current period">${dataManager.formatCurrency(freqPeriodTotals[freq] || 0)}</span>
                </div>
            `).join('')}
        `;
    }

    // Count how many occurrences of an item's frequency happen within the planning period using rounded period math
    countFrequencyOccurrencesInPeriod(item, range) {
        try {
            if (!range || !range.startDate || !range.endDate) return 0;
            const start = this.normalizeDate(range.startDate);
            const end = this.normalizeDate(range.endDate);
            const itemStart = this.normalizeDate(new Date(item['Start Date']));
            const itemEnd = this.normalizeDate(new Date(item['End Date']));
            const s = itemStart > start ? itemStart : start;
            const e = itemEnd < end ? itemEnd : end;
            if (e < s) return 0;

            return this.periodCount((item.Frequency || '').toLowerCase(), s, e);
        } catch (e) {
            return 0;
        }
    }

    // User-requested formula for counting occurrences within [start, end]
    periodCount(freq, start, end) {
        const f = (freq || '').toLowerCase();
        const compact = f.replace(/\s+/g, '');
        const has = (s) => compact.includes(s);

        // map mixed labels
        const isBiWeekly = has('biweekly') || has('bi-weekly');
        const isWeekly = !isBiWeekly && has('weekly');
        const isMonthly = has('monthly');
        const isQuarterly = has('quarter');
        const isYearly = has('year') || has('annual') || has('one-time') || has('onetime');

        if (isMonthly) {
            let months = (end.getFullYear() - start.getFullYear()) * 12
                       + (end.getMonth() - start.getMonth())
                       + (end.getDate() - start.getDate()) / 30;
            return Math.max(0, Math.round(months));
        }
        if (isQuarterly) {
            let months = (end.getFullYear() - start.getFullYear()) * 12
                       + (end.getMonth() - start.getMonth())
                       + (end.getDate() - start.getDate()) / 30;
            return Math.max(0, Math.round(months / 3));
        }
        if (isYearly) {
            let years = (end.getFullYear() - start.getFullYear())
                      + (end.getMonth() - start.getMonth()) / 12;
            const rounded = Math.max(0, Math.round(years));
            return rounded === 0 ? 1 : rounded; // ensure at least 1
        }
        if (isWeekly) {
            let weeks = (end - start) / (1000 * 60 * 60 * 24 * 7);
            return Math.max(0, Math.round(weeks));
        }
        if (isBiWeekly) {
            let biweeks = (end - start) / (1000 * 60 * 60 * 24 * 14);
            return Math.max(0, Math.round(biweeks));
        }
        // default to monthly behavior
        let months = (end.getFullYear() - start.getFullYear()) * 12
                   + (end.getMonth() - start.getMonth())
                   + (end.getDate() - start.getDate()) / 30;
        return Math.max(0, Math.round(months));
    }
    // Count overlapping months between two dates (any overlap counts as 1)
    countOverlappingMonths(start, end) {
        const sYearMonth = start.getFullYear() * 12 + start.getMonth();
        const eYearMonth = end.getFullYear() * 12 + end.getMonth();
        return Math.max(0, (eYearMonth - sYearMonth) + 1);
    }

    showAddModal(section) {
        this.editingIndex = -1;
        const tabId = section.toLowerCase().replace(/\s+/g, '-');
        const title = document.getElementById(`${tabId}-modal-title`);
        const form = document.getElementById(`${tabId}-form`);

        title.textContent = `Add ${section} Item`;
        clearForm(form);

        // Set default dates for income/expense items
        const isIncomeExpense = section.includes('Income') || section.includes('Expenses');
        if (isIncomeExpense) {
            const range = dataManager.getPlanningDateRange();
            if (range) {
                const startDateInput = document.getElementById(`${tabId}-startDate`);
                const endDateInput = document.getElementById(`${tabId}-endDate`);

                if (startDateInput) {
                    startDateInput.value = range.startDate.toISOString().split('T')[0];
                }
                if (endDateInput) {
                    endDateInput.value = range.endDate.toISOString().split('T')[0];
                }
            }
        }

        showModal(`${tabId}-modal`);
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';

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

            // Try to parse as regular date
            date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }

            // If all else fails, return empty string
            return '';
        } catch (error) {
            console.error('Error formatting date for input:', error);
            return '';
        }
    }

    formatDateForStorage(dateString) {
        if (!dateString) return '';

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
            console.error('Error formatting date for storage:', error);
            return dateString;
        }
    }

    editPlannerItem(section, index) {
        this.editingIndex = index;
        const planner = dataManager.getData('planner');
        const item = planner[section][index];
        
        const tabId = section.toLowerCase().replace(/\s+/g, '-');
        const title = document.getElementById(`${tabId}-modal-title`);
        
        title.textContent = `Edit ${section} Item`;
        
        const isHolding = section.includes('Holding') || section.includes('Outstanding');

        if (isHolding) {
            document.getElementById(`${tabId}-account`).value = item.Account;
            document.getElementById(`${tabId}-amount`).value = item.Amount;
        } else {
            document.getElementById(`${tabId}-subcategory`).value = item['Sub Category'] || item['Sub-Category'];
            document.getElementById(`${tabId}-frequency`).value = item.Frequency;
            document.getElementById(`${tabId}-amount`).value = item.Amount;
            document.getElementById(`${tabId}-startDate`).value = this.formatDateForInput(item['Start Date']);
            document.getElementById(`${tabId}-endDate`).value = this.formatDateForInput(item['End Date']);
            document.getElementById(`${tabId}-notes`).value = item.Notes || '';
        }
        
        showModal(`${tabId}-modal`);
    }

    savePlannerItem(section) {
        const tabId = section.toLowerCase().replace(/\s+/g, '-');
        const form = document.getElementById(`${tabId}-form`);
        
        if (!validateForm(form)) {
            return;
        }
        
        const isHolding = section.includes('Holding') || section.includes('Outstanding');
        let item;

        if (isHolding) {
            item = {
                Account: document.getElementById(`${tabId}-account`).value,
                Amount: parseFloat(document.getElementById(`${tabId}-amount`).value)
            };
        } else {
            item = {
                'Sub Category': document.getElementById(`${tabId}-subcategory`).value,
                Frequency: document.getElementById(`${tabId}-frequency`).value,
                Amount: parseFloat(document.getElementById(`${tabId}-amount`).value),
                'Start Date': this.formatDateForStorage(document.getElementById(`${tabId}-startDate`).value),
                'End Date': this.formatDateForStorage(document.getElementById(`${tabId}-endDate`).value),
                Notes: document.getElementById(`${tabId}-notes`).value
            };
        }
        
        if (this.editingIndex >= 0) {
            dataManager.updatePlannerItem(section, this.editingIndex, item);
        } else {
            dataManager.addPlannerItem(section, item);
        }
        
        hideModal(`${tabId}-modal`);

        // Reset pagination to show the new/updated item
        this.resetPagination();

        this.renderPlannerContent();
    }

    deletePlannerItem(section, index) {
        confirmDelete(`Are you sure you want to delete this ${section.toLowerCase()} item?`, () => {
            dataManager.deletePlannerItem(section, index);

            // Reset pagination after deletion to avoid empty pages
            this.resetPagination();

            this.renderPlannerContent();
        });
    }

    generatePaginationControls(currentPage, totalPages, sectionKey) {
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
                <button class="page-link" onclick="plannerManager.changePage('${sectionKey}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
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
                    <button class="page-link" onclick="plannerManager.changePage('${sectionKey}', 1)">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button class="page-link" onclick="plannerManager.changePage('${sectionKey}', ${i})">${i}</button>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `
                <li class="page-item">
                    <button class="page-link" onclick="plannerManager.changePage('${sectionKey}', ${totalPages})">${totalPages}</button>
                </li>
            `;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="plannerManager.changePage('${sectionKey}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
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

    changePage(sectionKey, newPage) {
        if (!this.pagination) {
            this.pagination = {};
        }
        if (!this.pagination[sectionKey]) {
            this.pagination[sectionKey] = { currentPage: 1, itemsPerPage: 10 };
        }

        this.pagination[sectionKey].currentPage = newPage;
        this.renderPlannerContent();
    }

    resetPagination() {
        // Reset pagination to page 1 for all sections
        if (this.pagination) {
            Object.keys(this.pagination).forEach(key => {
                this.pagination[key].currentPage = 1;
            });
        }
    }

}

// Initialize planner manager
window.plannerManager = new PlannerManager();
