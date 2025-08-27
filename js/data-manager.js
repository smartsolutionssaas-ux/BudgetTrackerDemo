// Data Manager - Handles all data operations and storage
class DataManager {
    constructor() {
        // Start with empty schemas (no initial sample data)
        this.data = this._emptySchemas();
        // Pluggable storage adapter
        this.storage = (window.StorageAdapters && window.StorageAdapters.createDefaultAdapter)
            ? window.StorageAdapters.createDefaultAdapter()
            : null;
        this.loadData();
    }

    // Define empty schemas for all datasets
    _emptySchemas() {
        return {
            categories: { Income: [], Expenses: [], Accounts: [], 'Debt Pay-Off': [], Investments: [], Currencies: [] },
            planner: {
                'Start Date': '',
                'Currency': '',
                'Current Holding': [],
                'Current Outstanding': [],
                'Expected Income': [],
                'Planned Expenses': [],
                'Planned Investments': []
            },
            transactions: { Transactions: [] },
            debtsPayoff: { 'Debt Pay-Off': [] },
            investments: { Investments: [] }
        };
    }

    // Load data: start empty, then override from storage if connected
    async loadData() {
        try {
            // Reset to empty each fresh load
            this.data = this._emptySchemas();
            // Load from storage adapter if available (overrides empty)
            await this.loadFromStorage();

            // Dispatch event that data is loaded
            document.dispatchEvent(new CustomEvent('dataLoaded'));

        } catch (error) {
            console.error('Error loading data:', error);
            // Try to load from storage adapter as fallback
            await this.loadFromStorage();
        }
    }

    // Get data by type
    getData(type) {
        return this.data[type];
    }

    // Save data to storage adapter
    async saveData(type, data) {
        this.data[type] = data;
        try {
            if (this.storage && this.storage.set) {
                await this.storage.set(type, data);
            }
        } catch (e) {
            console.warn('Storage save failed; keeping in memory only', e);
        }
        this.dispatchDataChangeEvent(type);
    }

    // Load data from storage adapter if connected, otherwise keep defaults
    async loadFromStorage() {
        try {
            if (!this.storage || !this.storage.loadAll) return;
            const connected = this.storage.isConnected ? await this.storage.isConnected() : true;
            if (!connected) return;
            const all = await this.storage.loadAll();
            Object.keys(this.data).forEach(type => {
                if (all && all[type]) {
                    this.data[type] = all[type];
                }
            });
        } catch (e) {
            console.warn('Storage load failed; using defaults', e);
        }
    }

    // Connect to a data folder (for FSA adapter)
    async connectDataFolder() {
        // Always ensure we are using the FSA adapter for folder connections
        try {
            if (!window.StorageAdapters || !window.StorageAdapters.FileSystemAccessStorage) return false;
            if (!(this.storage instanceof window.StorageAdapters.FileSystemAccessStorage)) {
                this.storage = new window.StorageAdapters.FileSystemAccessStorage();
            }
        } catch (_) {}
        if (!this.storage || !this.storage.connect) return false;
        await this.storage.connect();
        // After connect, check if folder has any JSON; if none, seed schema (categories from sample)
        try {
            const all = (this.storage.loadAll) ? await this.storage.loadAll() : null;
            const hasAnyData = !!(all && Object.values(all).some(v => {
                if (!v) return false;
                if (Array.isArray(v)) return v.length > 0;
                if (typeof v === 'object') return Object.keys(v).some(k => Array.isArray(v[k]) ? v[k].length > 0 : !!v[k]);
                return !!v;
            }));

            if (!hasAnyData) {
                // Build seed: categories from sampledata globals, others empty schema
                const empty = this._emptySchemas();
                let sampleCats = null;
                try { sampleCats = window.categoriesData || categoriesData || null; } catch(_) { sampleCats = window.categoriesData || null; }
                if (sampleCats) empty.categories = JSON.parse(JSON.stringify(sampleCats));
                // Persist seed files
                for (const key of Object.keys(empty)) {
                    if (this.storage.set) await this.storage.set(key, empty[key]);
                }
            }
        } catch (e) {
            console.warn('Failed to seed connected folder (if empty)', e);
        }
        // Reload from storage to ensure in-memory reflects folder
        await this.loadFromStorage();
        // Ensure planner has a start date; if missing, default to today and persist
        try {
            const planner = this.data?.planner;
            if (planner && (!planner['Start Date'] || String(planner['Start Date']).trim() === '')) {
                const today = new Date();
                const formatted = this.formatDateForStorage(today);
                this.data.planner['Start Date'] = formatted;
                if (this.storage && this.storage.set) {
                    await this.storage.set('planner', this.data.planner);
                }
            }
        } catch (_) {}
        document.dispatchEvent(new CustomEvent('dataLoaded'));
        document.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: 'all' } }));
        return true;
    }

    // Populate from embedded sampledata/*.js globals
    async populateFromSample() {
        // If a folder is connected, disconnect it and switch to in-memory before populating samples
        try {
            if (this.storage && this.storage.isConnected && await this.storage.isConnected()) {
                if (typeof this.storage.disconnect === 'function') {
                    await this.storage.disconnect();
                }
            }
        } catch (_) {}
        try {
            if (window.StorageAdapters && window.StorageAdapters.MemoryStorage) {
                this.storage = new window.StorageAdapters.MemoryStorage();
            }
        } catch (_) {}

        const out = this._emptySchemas();
        const safeCopy = (src) => src ? JSON.parse(JSON.stringify(src)) : src;
        try { out.categories = safeCopy(window.categoriesData || categoriesData || null) || out.categories; } catch (_) { out.categories = safeCopy(window.categoriesData) || out.categories; }
        try { out.planner = safeCopy(window.plannerData || plannerData || null) || out.planner; } catch (_) { out.planner = safeCopy(window.plannerData) || out.planner; }
        try { out.transactions = safeCopy(window.transactionsData || transactionsData || null) || out.transactions; } catch (_) { out.transactions = safeCopy(window.transactionsData) || out.transactions; }
        try { out.debtsPayoff = safeCopy(window.debtsPayoffData || debtsPayoffData || null) || out.debtsPayoff; } catch (_) { out.debtsPayoff = safeCopy(window.debtsPayoffData) || out.debtsPayoff; }
        try { out.investments = safeCopy(window.investmentsData || investmentsData || null) || out.investments; } catch (_) { out.investments = safeCopy(window.investmentsData) || out.investments; }

        // Replace in-memory state
        this.data = out;
        // Persist to current storage (in-memory adapter keeps it session-only)
        try {
            if (this.storage && this.storage.set && (!this.storage.isConnected || await this.storage.isConnected())) {
                for (const key of Object.keys(out)) {
                    await this.storage.set(key, out[key]);
                }
            }
        } catch (e) {
            console.warn('Populate Sample: failed to persist to storage, using in-memory only', e);
        }
        document.dispatchEvent(new CustomEvent('dataLoaded'));
        document.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: 'all' } }));
    }

    async getStorageLabel() {
        try {
            if (this.storage && this.storage.label) {
                const val = typeof this.storage.label === 'function' ? this.storage.label() : this.storage.label;
                return (typeof val?.then === 'function') ? await val : String(val);
            }
        } catch {}
        return 'In-Memory';
    }

    async isFolderConnected() {
        try {
            const isFSA = this.storage instanceof (window.StorageAdapters?.FileSystemAccessStorage || function(){})
                || this.storage?.kind === 'fsa';
            if (!isFSA) return false;
            if (typeof this.storage.isConnected === 'function') {
                return !!(await this.storage.isConnected());
            }
            return !!this.storage?.dirHandle;
        } catch {
            return false;
        }
    }

    getCurrentStorageKind() {
        try {
            return this.storage?.kind || 'memory';
        } catch { return 'memory'; }
    }

    // Dispatch custom event when data changes
    dispatchDataChangeEvent(type) {
        const event = new CustomEvent('dataChanged', {
            detail: { type, data: this.data[type] }
        });
        document.dispatchEvent(event);
    }

    // Categories CRUD operations
    addCategory(categoryType, item) {
        if (!this.data.categories[categoryType]) {
            this.data.categories[categoryType] = [];
        }
        
        // Validate cross-category constraints for Accounts and Debt Pay-Off
        const validationResult = this.validateCategoryCrossConstraints(categoryType, item, -1);
        if (!validationResult.valid) {
            throw new Error(validationResult.message);
        }
        
        if (categoryType === 'Currencies') {
            this.data.categories[categoryType].push(item);
        } else {
            this.data.categories[categoryType].push(item);
        }
        
        this.saveData('categories', this.data.categories);
    }

    updateCategory(categoryType, index, item) {
        if (this.data.categories[categoryType] && this.data.categories[categoryType][index]) {
            // Validate cross-category constraints for Accounts and Debt Pay-Off
            const validationResult = this.validateCategoryCrossConstraints(categoryType, item, index);
            if (!validationResult.valid) {
                throw new Error(validationResult.message);
            }
            
            this.data.categories[categoryType][index] = item;
            this.saveData('categories', this.data.categories);
        }
    }

    deleteCategory(categoryType, index) {
        if (this.data.categories[categoryType] && this.data.categories[categoryType][index]) {
            this.data.categories[categoryType].splice(index, 1);
            this.saveData('categories', this.data.categories);
        }
    }

    // Validate cross-category constraints between Accounts and Debt Pay-Off
    validateCategoryCrossConstraints(categoryType, item, currentIndex = -1) {
        // Only apply validation to Accounts and Debt Pay-Off categories
        if (categoryType !== 'Accounts' && categoryType !== 'Debt Pay-Off') {
            return { valid: true };
        }

        const itemName = typeof item === 'string' ? item : (item.Currency || item['Currency'] || '');
        if (!itemName) {
            return { valid: true };
        }

        // Check the opposite category for conflicts
        const oppositeCategory = categoryType === 'Accounts' ? 'Debt Pay-Off' : 'Accounts';
        const oppositeItems = this.data.categories[oppositeCategory] || [];

        // Check if this item already exists in the opposite category
        const existsInOpposite = oppositeItems.some(existingItem => {
            const existingName = typeof existingItem === 'string' ? existingItem : (existingItem.Currency || existingItem['Currency'] || '');
            return existingName.toLowerCase() === itemName.toLowerCase();
        });

        if (existsInOpposite) {
            const categoryLabel = categoryType === 'Accounts' ? 'Account' : 'Debt Pay-Off item';
            const oppositeCategoryLabel = oppositeCategory === 'Accounts' ? 'Account' : 'Debt Pay-Off item';
            return {
                valid: false,
                message: `Cannot save "${itemName}" as ${categoryLabel} because it already exists as ${oppositeCategoryLabel}. Items cannot exist in both Accounts and Debt Pay-Off categories simultaneously.`
            };
        }

        return { valid: true };
    }

    // Planner CRUD operations
    addPlannerItem(section, item) {
        if (!this.data.planner[section]) {
            this.data.planner[section] = [];
        }
        this.data.planner[section].push(item);
        this.saveData('planner', this.data.planner);
    }

    updatePlannerItem(section, index, item) {
        if (this.data.planner[section] && this.data.planner[section][index]) {
            this.data.planner[section][index] = item;
            this.saveData('planner', this.data.planner);
        }
    }

    deletePlannerItem(section, index) {
        if (this.data.planner[section] && this.data.planner[section][index]) {
            this.data.planner[section].splice(index, 1);
            this.saveData('planner', this.data.planner);
        }
    }

    updatePlannerSettings(startDate, currency) {
        // Format date for storage (convert YYYY-MM-DD to DD-MMM-YYYY)
        let formattedDate = startDate;
        if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
            const date = new Date(startDate);
            if (!isNaN(date.getTime())) {
                const day = date.getDate().toString().padStart(2, '0');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = monthNames[date.getMonth()];
                const year = date.getFullYear();
                formattedDate = `${day}-${month}-${year}`;
            }
        }

        this.data.planner['Start Date'] = formattedDate;
        this.data.planner['Currency'] = currency; // Currency is already a symbol like "$", "€", etc.
        this.saveData('planner', this.data.planner);
    }

    // Transaction CRUD operations
    addTransaction(item) {
        if (!this.data.transactions.Transactions) {
            this.data.transactions.Transactions = [];
        }
        
        // Auto-generate S No
        const maxSNo = Math.max(...this.data.transactions.Transactions.map(t => t['S No'] || 0), 0);
        item['S No'] = maxSNo + 1;
        
        this.data.transactions.Transactions.push(item);
        this.saveData('transactions', this.data.transactions);
    }

    updateTransaction(index, item) {
        if (this.data.transactions.Transactions && this.data.transactions.Transactions[index]) {
            // Preserve the original S No
            const originalSNo = this.data.transactions.Transactions[index]['S No'];
            item['S No'] = originalSNo;

            this.data.transactions.Transactions[index] = item;
            this.saveData('transactions', this.data.transactions);
        }
    }

    deleteTransaction(index) {
        if (this.data.transactions.Transactions && this.data.transactions.Transactions[index]) {
            this.data.transactions.Transactions.splice(index, 1);

            // Renumber S No to maintain sequence
            this.data.transactions.Transactions.forEach((transaction, idx) => {
                transaction['S No'] = idx + 1;
            });

            this.saveData('transactions', this.data.transactions);
        }
    }

    // Debt Payoff CRUD operations
    addDebtPayoff(item) {
        if (!this.data.debtsPayoff['Debt Pay-Off']) {
            this.data.debtsPayoff['Debt Pay-Off'] = [];
        }
        
        // Auto-generate S No
        const maxSNo = Math.max(...this.data.debtsPayoff['Debt Pay-Off'].map(d => d['S No'] || 0), 0);
        item['S No'] = maxSNo + 1;
        
        this.data.debtsPayoff['Debt Pay-Off'].push(item);
        this.saveData('debtsPayoff', this.data.debtsPayoff);
    }

    updateDebtPayoff(index, item) {
        if (this.data.debtsPayoff['Debt Pay-Off'] && this.data.debtsPayoff['Debt Pay-Off'][index]) {
            // Preserve the original S No
            const originalSNo = this.data.debtsPayoff['Debt Pay-Off'][index]['S No'];
            item['S No'] = originalSNo;

            this.data.debtsPayoff['Debt Pay-Off'][index] = item;
            this.saveData('debtsPayoff', this.data.debtsPayoff);
        }
    }

    deleteDebtPayoff(index) {
        if (this.data.debtsPayoff['Debt Pay-Off'] && this.data.debtsPayoff['Debt Pay-Off'][index]) {
            this.data.debtsPayoff['Debt Pay-Off'].splice(index, 1);

            // Renumber S No to maintain sequence
            this.data.debtsPayoff['Debt Pay-Off'].forEach((payment, idx) => {
                payment['S No'] = idx + 1;
            });

            this.saveData('debtsPayoff', this.data.debtsPayoff);
        }
    }

    // Investments CRUD operations
    addInvestment(item) {
        if (!this.data.investments) {
            this.data.investments = { 'Investments': [] };
        }
        if (!this.data.investments['Investments']) {
            this.data.investments['Investments'] = [];
        }

        // Auto-generate S No
        const maxSNo = Math.max(...this.data.investments['Investments'].map(i => i['S No'] || 0), 0);
        item['S No'] = maxSNo + 1;

        this.data.investments['Investments'].push(item);
        this.saveData('investments', this.data.investments);
    }

    updateInvestment(index, item) {
        if (this.data.investments['Investments'] && this.data.investments['Investments'][index]) {
            // Preserve the original S No
            const originalSNo = this.data.investments['Investments'][index]['S No'];
            item['S No'] = originalSNo;

            this.data.investments['Investments'][index] = item;
            this.saveData('investments', this.data.investments);
        }
    }

    deleteInvestment(index) {
        if (this.data.investments['Investments'] && this.data.investments['Investments'][index]) {
            this.data.investments['Investments'].splice(index, 1);

            // Renumber S No to maintain sequence
            this.data.investments['Investments'].forEach((investment, idx) => {
                investment['S No'] = idx + 1;
            });

            this.saveData('investments', this.data.investments);
        }
    }

    // Utility functions
    formatCurrency(amount, currencySymbol = null) {
        // Use planner currency if no specific currency symbol provided
        if (!currencySymbol && this.data.planner && this.data.planner['Currency']) {
            currencySymbol = this.data.planner['Currency'];
        }

        // Default to $ if still no currency
        if (!currencySymbol) {
            currencySymbol = '$';
        }

        return `${currencySymbol}${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // Filter data by date range
    filterByDateRange(data, startDate, endDate, dateField = 'Date') {
        // If no date range specified, return all data
        if (!startDate || !endDate) return data;

        const start = new Date(startDate);
        const end = new Date(endDate);

        const filteredData = data.filter(item => {
            // Handle different date formats
            let itemDateStr = item[dateField];
            if (typeof itemDateStr === 'string') {
                // Convert DD-MMM-YYYY to MM/DD/YYYY for better parsing
                itemDateStr = itemDateStr.replace(/(\d{2})-(\w{3})-(\d{4})/, (_, day, month, year) => {
                    const monthMap = {
                        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                    };
                    return `${monthMap[month]}/${day}/${year}`;
                });
            }

            const itemDate = new Date(itemDateStr);
            return !isNaN(itemDate) && itemDate >= start && itemDate <= end;
        });

        return filteredData;
    }

    // Get date range presets
    getDateRange(preset) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        switch (preset) {
            case 'current-month':
                return {
                    start: new Date(currentYear, currentMonth, 1),
                    end: new Date(currentYear, currentMonth + 1, 0)
                };
            case 'last-month':
                return {
                    start: new Date(currentYear, currentMonth - 1, 1),
                    end: new Date(currentYear, currentMonth, 0)
                };
            case 'current-year':
                return {
                    start: new Date(currentYear, 0, 1),
                    end: new Date(currentYear, 11, 31)
                };
            case 'last-year':
                return {
                    start: new Date(currentYear - 1, 0, 1),
                    end: new Date(currentYear - 1, 11, 31)
                };
            default:
                return { start: null, end: null };
        }
    }

    // Date validation utilities
    getPlanningDateRange() {
        const planner = this.data.planner;
        if (!planner || !planner['Start Date']) {
            return null;
        }

        // Parse the date string properly (format: "01-Jan-2024")
        const startDate = this.parseStorageDate(planner['Start Date']);
        if (!startDate || isNaN(startDate.getTime())) {
            return null;
        }

        // End date should be rolling 12 months from start date minus 1 day
        // Example: 15-Jan-2025 -> 14-Jan-2026
        const oneYearLater = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate(), 12, 0, 0, 0);
        const endDate = new Date(oneYearLater);
        endDate.setDate(endDate.getDate() - 1);
        return {
            startDate: startDate,
            endDate: endDate,
            startDateString: this.formatDateForStorage(startDate),
            endDateString: this.formatDateForStorage(endDate)
        };
    }

    // Helper method to parse storage date format (DD-MMM-YYYY)
    parseStorageDate(dateString) {
        if (!dateString) return null;

        // Handle format like "01-Jan-2024"
        const parts = dateString.split('-');
        if (parts.length !== 3) return null;

        const day = parseInt(parts[0], 10);
        const monthStr = parts[1];
        const year = parseInt(parts[2], 10);

        const monthMap = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };

        const month = monthMap[monthStr];
        if (month === undefined) return null;

        // Create date at noon to avoid timezone issues
        const date = new Date(year, month, day, 12, 0, 0, 0);
        return date;
    }

    isDateInPlanningRange(dateString) {
        const range = this.getPlanningDateRange();
        if (!range) return true; // If no planning range set, allow any date

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return false;

        return date >= range.startDate && date <= range.endDate;
    }

    formatDateForStorage(date) {
        if (!date) return '';

        const day = date.getDate().toString().padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    }

    validateStartDateChange(newStartDate) {
        const newStart = new Date(newStartDate);
        if (isNaN(newStart.getTime())) {
            return { valid: false, message: 'Invalid date format' };
        }

        // New end date should be rolling 12 months from new start minus 1 day
        const tmp = new Date(newStart.getFullYear() + 1, newStart.getMonth(), newStart.getDate());
        const newEnd = new Date(tmp);
        newEnd.setDate(newEnd.getDate() - 1);

        // Check all existing data
        const violations = [];

        // Check transactions
        if (this.data.transactions && this.data.transactions.Transactions) {
            this.data.transactions.Transactions.forEach((transaction, index) => {
                const transDate = new Date(transaction.Date);
                if (!isNaN(transDate.getTime()) && (transDate < newStart || transDate > newEnd)) {
                    violations.push(`Transaction #${index + 1} (${transaction.Date})`);
                }
            });
        }

        // Check debt payoff
        if (this.data.debtsPayoff && this.data.debtsPayoff['Debt Pay-Off']) {
            this.data.debtsPayoff['Debt Pay-Off'].forEach((debt, index) => {
                const debtDate = new Date(debt.Date);
                if (!isNaN(debtDate.getTime()) && (debtDate < newStart || debtDate > newEnd)) {
                    violations.push(`Debt Payment #${index + 1} (${debt.Date})`);
                }
            });
        }

        // Check planner items with dates
        if (this.data.planner) {
            ['Expected Income', 'Planned Expenses'].forEach(section => {
                if (this.data.planner[section]) {
                    this.data.planner[section].forEach((item, index) => {
                        const startDate = new Date(item['Start Date']);
                        const endDate = new Date(item['End Date']);

                        if (!isNaN(startDate.getTime()) && (startDate < newStart || startDate > newEnd)) {
                            violations.push(`${section} #${index + 1} Start Date (${item['Start Date']})`);
                        }
                        if (!isNaN(endDate.getTime()) && (endDate < newStart || endDate > newEnd)) {
                            violations.push(`${section} #${index + 1} End Date (${item['End Date']})`);
                        }
                    });
                }
            });
        }

        if (violations.length > 0) {
            return {
                valid: false,
                message: `Cannot change start date. The following existing records would fall outside the planning period:\n\n${violations.join('\n')}\n\nPlease update or remove these records first.`
            };
        }

        return { valid: true };
    }

    // ===== Export / Import (Excel Workbook) =====
    // Build a full workbook and download as .xlsx
    async exportWorkbook(filename = 'FinancialData.xlsx') {
        try {
            if (typeof XLSX === 'undefined') {
                console.error('SheetJS (XLSX) not loaded');
                return;
            }

            const wb = XLSX.utils.book_new();

            // Helper to set a date display format on cells whose headers include 'Date'
            const setDateFormat = (ws) => {
                if (!ws || !ws['!ref']) return;
                const range = XLSX.utils.decode_range(ws['!ref']);
                // First row assumed to be headers
                const headerMap = {};
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
                    const cell = ws[addr];
                    const header = cell ? String(cell.v || cell.w || '') : '';
                    headerMap[C] = header;
                }
                for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const header = headerMap[C] || '';
                        if (/date/i.test(header)) {
                            const addr = XLSX.utils.encode_cell({ r: R, c: C });
                            const cell = ws[addr];
                            if (cell && (cell.t === 'd' || cell.t === 'n')) {
                                cell.z = 'dd-mmm-yyyy';
                            }
                        }
                    }
                }
            };

            // Helper: ensure Date objects for any field with "Date" in the key
            const toDateIfPossible = (val) => {
                if (!val) return val;
                if (val instanceof Date) return val;
                if (typeof val === 'string') {
                    // Try storage format DD-MMM-YYYY first
                    const d = this.parseStorageDate(val);
                    if (d) return d;
                    const d2 = new Date(val);
                    if (!isNaN(d2.getTime())) return d2;
                }
                return val;
            };

            const convertDatesInArray = (arr) => (arr || []).map(row => {
                const out = { ...row };
                Object.keys(out).forEach(k => {
                    if (/date/i.test(k)) {
                        out[k] = toDateIfPossible(out[k]);
                    }
                });
                return out;
            });

            // 1) Planner - split into multiple sheets
            const planner = this.data.planner || {};
            // Planner_Main as key/value rows
            const plannerMain = [
                { Key: 'Start Date', Value: toDateIfPossible(planner['Start Date'] || '') },
                { Key: 'Currency', Value: planner['Currency'] || '' }
            ];
            const wsPlannerMain = XLSX.utils.json_to_sheet(plannerMain);
            setDateFormat(wsPlannerMain);
            XLSX.utils.book_append_sheet(wb, wsPlannerMain, 'Planner_Main');

            const plannerSections = [
                ['Current Holding', 'Planner_CurrentHolding'],
                ['Current Outstanding', 'Planner_CurrentOutstanding'],
                ['Expected Income', 'Planner_ExpectedIncome'],
                ['Planned Expenses', 'Planner_PlannedExpenses'],
                ['Planned Investments', 'Planner_PlannedInvestments']
            ];
            plannerSections.forEach(([key, sheetName]) => {
                const data = convertDatesInArray((planner && planner[key]) || []);
                const ws = XLSX.utils.json_to_sheet(data);
                setDateFormat(ws);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // 2) Categories - one sheet per category group
            const categories = this.data.categories || {};
            const catSheets = [
                // Excluding Currencies per requirement
                ['Income', 'Categories_Income'],
                ['Expenses', 'Categories_Expenses'],
                ['Accounts', 'Categories_Accounts'],
                ['Debt Pay-Off', 'Categories_DebtPayOff'],
                ['Investments', 'Categories_Investments']
            ];
            catSheets.forEach(([key, sheetName]) => {
                const arr = (categories && categories[key]) || [];
                // Normalize to array of objects if strings
                const normalized = Array.isArray(arr) ? arr.map(item => {
                    if (item && typeof item === 'object') return item;
                    return { Value: item };
                }) : [];
                const ws = XLSX.utils.json_to_sheet(normalized);
                setDateFormat(ws);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // 3) Transactions
            const transactions = this.data.transactions?.Transactions || [];
            const wsTransactions = XLSX.utils.json_to_sheet(convertDatesInArray(transactions));
            setDateFormat(wsTransactions);
            XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions');

            // 4) Debt Pay-Off
            const debt = this.data.debtsPayoff?.['Debt Pay-Off'] || [];
            const wsDebt = XLSX.utils.json_to_sheet(convertDatesInArray(debt));
            setDateFormat(wsDebt);
            XLSX.utils.book_append_sheet(wb, wsDebt, 'Debt_Pay_Off');

            // 5) Investments
            const investments = this.data.investments?.Investments || [];
            const wsInv = XLSX.utils.json_to_sheet(convertDatesInArray(investments));
            setDateFormat(wsInv);
            XLSX.utils.book_append_sheet(wb, wsInv, 'Investments');

            // Write with date cells preserved
            // Prefer File System Access API to prompt user for save location
            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [
                            {
                                description: 'Excel Workbook',
                                accept: {
                                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                                }
                            }
                        ]
                    });
                    const writable = await handle.createWritable();
                    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true });
                    await writable.write(new Blob([wbArray], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }));
                    await writable.close();
                } else {
                    // Fallback: trigger browser download to default folder
                    XLSX.writeFile(wb, filename, { bookType: 'xlsx', cellDates: true });
                }
            } catch (fsErr) {
                // If user cancels or FS API fails, fallback to download
                if (window.DEBUG) console.warn('Save picker unavailable or canceled, falling back to download', fsErr);
                XLSX.writeFile(wb, filename, { bookType: 'xlsx', cellDates: true });
            }
        } catch (err) {
            console.error('Error exporting workbook:', err);
        }
    }

    // Import from a workbook file, replace all data, and reload
    async importWorkbookFromFile(file) {
        try {
            if (typeof XLSX === 'undefined') {
                console.error('SheetJS (XLSX) not loaded');
                return;
            }
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array', cellDates: true });

            // Helpers
            const sheet = (name) => wb.Sheets[name] || null;
            const sheetToJson = (name) => sheet(name) ? XLSX.utils.sheet_to_json(sheet(name), { defval: '' }) : [];

            // Reconstruct planner
            const planner = {};
            const plannerMain = sheetToJson('Planner_Main');
            plannerMain.forEach(row => {
                if (row.Key === 'Start Date') {
                    const v = row.Value;
                    if (v instanceof Date) {
                        planner['Start Date'] = this.formatDateForStorage(v);
                    } else if (typeof v === 'string') {
                        const d = this.parseStorageDate(v) || new Date(v);
                        if (d && !isNaN(d.getTime())) planner['Start Date'] = this.formatDateForStorage(d);
                        else planner['Start Date'] = v || '';
                    } else {
                        planner['Start Date'] = '';
                    }
                }
                if (row.Key === 'Currency') planner['Currency'] = row.Value || '';
            });

            const plannerSections = [
                ['Planner_CurrentHolding', 'Current Holding'],
                ['Planner_CurrentOutstanding', 'Current Outstanding'],
                ['Planner_ExpectedIncome', 'Expected Income'],
                ['Planner_PlannedExpenses', 'Planned Expenses'],
                ['Planner_PlannedInvestments', 'Planned Investments']
            ];
            plannerSections.forEach(([sheetName, key]) => {
                const rows = sheetToJson(sheetName).map(r => this._coerceDatesInRow(r));
                planner[key] = rows;
            });

            // Reconstruct categories
            // Start with existing categories and overwrite specific groups; preserve 'Currencies'
            const categories = { ...(this.data.categories || {}) };
            const catSheets = [
                // Excluding Currencies per requirement
                ['Categories_Income', 'Income'],
                ['Categories_Expenses', 'Expenses'],
                ['Categories_Accounts', 'Accounts'],
                ['Categories_DebtPayOff', 'Debt Pay-Off'],
                ['Categories_Investments', 'Investments']
            ];
            catSheets.forEach(([sheetName, key]) => {
                const rows = sheetToJson(sheetName);
                // If exported as {Value: <string>} or as objects, handle both
                categories[key] = rows.map(r => (r.Value !== undefined ? r.Value : r));
            });

            // Transactions
            const transactionsRows = sheetToJson('Transactions').map(r => this._coerceDatesInRow(r));
            const transactions = { Transactions: transactionsRows };

            // Debt Pay-Off
            const debtRows = sheetToJson('Debt_Pay_Off').map(r => this._coerceDatesInRow(r));
            const debtsPayoff = { 'Debt Pay-Off': debtRows };

            // Investments
            const invRows = sheetToJson('Investments').map(r => this._coerceDatesInRow(r));
            const investments = { Investments: invRows };

            // Replace storage entirely via adapter
            try {
                await this.saveData('categories', categories);
                await this.saveData('planner', planner);
                await this.saveData('transactions', transactions);
                await this.saveData('debtsPayoff', debtsPayoff);
                await this.saveData('investments', investments);
            } catch (e) {
                console.warn('Failed to persist imported data to adapter', e);
            }

            // Reload in-memory data and notify
            await this.loadFromStorage();
            document.dispatchEvent(new CustomEvent('dataLoaded'));
            document.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: 'all' } }));
        } catch (err) {
            console.error('Error importing workbook:', err);
        }
    }

    // Normalize any fields that look like dates back to storage format
    _coerceDatesInRow(row) {
        const out = { ...row };
        Object.keys(out).forEach(k => {
            const v = out[k];
            if (/date/i.test(k)) {
                if (v instanceof Date) {
                    out[k] = this.formatDateForStorage(v);
                } else if (typeof v === 'number') {
                    // Excel serial date
                    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(v) : null;
                    if (d) {
                        const js = new Date(d.y, d.m - 1, d.d, 12, 0, 0, 0);
                        out[k] = this.formatDateForStorage(js);
                    } else {
                        out[k] = v;
                    }
                } else if (typeof v === 'string') {
                    const d = this.parseStorageDate(v) || new Date(v);
                    if (d && !isNaN(d.getTime())) {
                        out[k] = this.formatDateForStorage(d);
                    }
                }
            }
        });
        return out;
    }
}

// Initialize global data manager
const dataManager = new DataManager();
// Expose on window for modules that reference window.dataManager
try { window.dataManager = dataManager; } catch(_) {}

// Load data with retry mechanism
function initializeDataWithRetry() {
    let retryCount = 0;
    const maxRetries = 5;

    function tryLoad() {
        dataManager.loadData();

        // Check if data was loaded successfully
        const categories = dataManager.getData('categories');
        const planner = dataManager.getData('planner');
        const transactions = dataManager.getData('transactions');
        const debtsPayoff = dataManager.getData('debtsPayoff');

        const hasData = categories && planner && transactions && debtsPayoff;

        if (!hasData && retryCount < maxRetries - 1) {
            retryCount++;
            if (window.DEBUG) console.log('Data not fully loaded, retrying in 100ms...');
            setTimeout(tryLoad, 100);
        } else if (hasData) {
            if (window.DEBUG) console.log('Data loaded successfully!');
        } else {
            console.error('Failed to load data after', maxRetries, 'attempts');
        }
    }

    tryLoad();
}

// Initialize immediately
initializeDataWithRetry();

// Also try on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const hasData = dataManager.getData('categories');
    if (!hasData) {
        if (window.DEBUG) console.log('Retrying data load on DOM ready...');
        initializeDataWithRetry();
    }
});
