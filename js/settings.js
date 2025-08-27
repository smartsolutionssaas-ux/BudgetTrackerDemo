// Settings Manager
class SettingsManager {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        this.populateCurrencyDropdown();
        this.loadSettings();
        this.initialized = true;
    }

    refresh() {
        this.loadSettings();
    }

    populateCurrencyDropdown() {
        const categories = dataManager.getData('categories');
        const currencySelect = document.getElementById('plannerCurrency');
        if (!currencySelect) return;

        currencySelect.innerHTML = '<option value="">Select Currency</option>';

        // Prefer hardcoded currencies when available
        const list = (window.HARDCODED_CURRENCIES && Array.isArray(window.HARDCODED_CURRENCIES))
            ? window.HARDCODED_CURRENCIES
            : (categories?.Currencies || []);

        list.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency.Symbol;
            option.textContent = `${currency.Currency} (${currency.Symbol})`;
            currencySelect.appendChild(option);
        });
    }

    loadSettings() {
        this.loadPlannerSettings();
        this.loadDisplaySettings();
    }

    loadPlannerSettings() {
        const planner = dataManager.getData('planner');
        if (!planner) return;

        const startDateInput = document.getElementById('plannerStartDate');
        const currencySelect = document.getElementById('plannerCurrency');

        if (startDateInput && planner['Start Date']) {
            const formattedDate = this.formatDateForInput(planner['Start Date']);
            startDateInput.value = formattedDate;
            if (window.DEBUG) console.log('Settings page - Loaded start date:', formattedDate);

            // Add validation message
            this.addDateValidationInfo(startDateInput);
        }

        if (currencySelect && planner['Currency']) {
            currencySelect.value = planner['Currency'];
            if (window.DEBUG) console.log('Settings page - Loaded currency:', planner['Currency']);
        }
    }

    addDateValidationInfo(startDateInput) {
        // Remove existing validation info
        const existingInfo = startDateInput.parentNode.querySelector('.date-validation-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        // Add validation info with better styling
        const validationInfo = document.createElement('div');
        validationInfo.className = 'date-validation-info alert alert-info py-2 px-3 mt-2 mb-0';
        validationInfo.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="bi bi-info-circle-fill me-2 mt-1 flex-shrink-0"></i>
                <div>
                    <strong>Planning Period:</strong> One year from start date<br>
                    <small class="text-muted">Changing this date will validate against existing transactions, debt payments, and planner items. Any records outside the new planning period will prevent the change.</small>
                </div>
            </div>
        `;
        startDateInput.parentNode.appendChild(validationInfo);
    }

    loadDisplaySettings() {
        // Load display settings from localStorage or use defaults
        const dateFormat = localStorage.getItem('dateFormat') || 'DD-MMM-YYYY';
        const numberFormat = localStorage.getItem('numberFormat') || 'US';

        const dateFormatSelect = document.getElementById('dateFormat');
        const numberFormatSelect = document.getElementById('numberFormat');

        if (dateFormatSelect) {
            dateFormatSelect.value = dateFormat;
        }

        if (numberFormatSelect) {
            numberFormatSelect.value = numberFormat;
        }
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
}

// Global functions for settings updates
function updateDisplaySettings() {
    const dateFormat = document.getElementById('dateFormat').value;
    const numberFormat = document.getElementById('numberFormat').value;
    
    // Save to localStorage
    localStorage.setItem('dateFormat', dateFormat);
    localStorage.setItem('numberFormat', numberFormat);
    
    app.showNotification('Display settings updated successfully', 'success');
}

// Initialize settings manager
window.settingsManager = new SettingsManager();
