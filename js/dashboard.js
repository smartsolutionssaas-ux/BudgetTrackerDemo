// Dashboard Manager - Unified Financial Dashboard
class DashboardManager {
    constructor() {
        this.charts = {};
        this.initialized = false;
    }

    // Robust date parser: prefer dataManager.parseStorageDate (e.g., "15-Jan-2025"), fallback to Date()
    parseDate(value) {
        if (!value) return new Date(NaN);
        try {
            if (window.dataManager && typeof dataManager.parseStorageDate === 'function') {
                const d = dataManager.parseStorageDate(value);
                if (d && !isNaN(d.getTime())) return d;
            }
        } catch (e) {
            // ignore and fallback
        }
        const d2 = new Date(value);
        return d2;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        if (window.DEBUG) console.log('Dashboard Manager initialized');
    }

    refresh() {
        this.renderDashboard();
    }

    renderDashboard() {
        const container = document.getElementById('dashboard-content');
        if (!container) return;

        const stats = this.calculateStatistics();

        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-0"><i class="bi bi-speedometer2 me-2"></i>Financial Dashboard</h2>
                            <p class="text-muted mb-0">Comprehensive overview of your financial performance</p>
                        </div>
                        <div>
                            <button id="btn-recalc-dashboard" type="button" class="btn btn-outline-primary btn-sm" title="Recalculate and refresh dashboard" onclick="window.dashboardManager && window.dashboardManager.refresh()">
                                <i class="bi bi-arrow-repeat me-1"></i> Recalculate
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Demo Mode Banner -->
            <div class="alert alert-warning d-flex align-items-start" role="alert">
                <i class="bi bi-eye me-2 fs-5"></i>
                <div>
                    <strong>Demo Mode:</strong> Sample data is preloaded for exploration. Your changes are temporary and will be cleared when the browser/tab is closed.
                    <strong>Full Version:</strong> Please visit <a href="smartsaas.gumroad.com/l/ylusel">smartsaas.gumroad.com/l/ylusel</a>. 75% offer going on for a limited time.
                    <div class="small mt-1">
                        <span class="badge bg-warning text-dark me-1">Demo</span> core features are available for preview. Actions like Connect Folder, Import/Export, and Clear Data are disabled in this demo build.
                    </div>
                </div>
            </div>

            <!-- Key Metrics Cards -->
            <div class="row mb-4">
                ${this.renderKeyMetricsCards(stats)}
            </div>

            <!-- Row 1: Net Worth Overview + Monthly Cash Flow -->
            <div class="row mb-4">
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="bi bi-cash-coin me-2"></i>Investments: Planned vs Actual</h5>
                        </div>
                        <div class="card-body" style="height: 400px; position: relative;">
                            <canvas id="investmentsTrendChart" style="max-width: 100%; max-height: 100%;"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="bi bi-bar-chart me-2"></i>Monthly Cash Flow</h5>
                        </div>
                        <div class="card-body" style="height: 400px; position: relative;">
                            <canvas id="cashFlowChart" style="max-width: 100%; max-height: 100%;"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row 2 -->
            <div class="row mb-4">
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-graph-up me-2"></i>Account Balances Trend</h5>
                            <span class="badge bg-light text-dark">
                                Start: ${stats.currency}${(stats.totalHoldings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                &nbsp;→&nbsp;
                                End: ${stats.currency}${(stats.currentHoldings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div class="card-body" style="height: 400px; position: relative;">
                            <canvas id="balanceTrendChart" style="max-width: 100%; max-height: 100%;"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="bi bi-credit-card me-2"></i>Debt Payoff Progress</h5>
                        </div>
                        <div class="card-body" style="height: 400px; position: relative;">
                            <canvas id="debtProgressChart" style="max-width: 100%; max-height: 100%;"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Net Worth vs Category Analysis (side-by-side) -->
            <div class="row mb-4 align-items-stretch">
                <div class="col-md-6 mb-3 d-flex">
                    <div class="card h-100 w-100">
                        <div class="card-header">
                            <h5><i class="bi bi-piggy-bank me-2"></i>Net Worth Overview</h5>
                        </div>
                        <div class="card-body" id="netWorthBody">
                            <div id="netWorthStats"></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3 d-flex">
                    <div class="card h-100 w-100">
                        <div class="card-header">
                            <h5><i class="bi bi-table me-2"></i>Category Analysis</h5>
                        </div>
                        <div class="card-body" id="categoryAnalysisBody">
                            ${this.renderCategoryAnalysis(stats)}
                        </div>
                    </div>
                </div>
            </div>

            
        `;

        // Render charts after DOM is updated
        setTimeout(() => {
            this.renderNetWorthStats(stats);
            this.renderCashFlowChart(stats);
            this.renderBalanceTrendChart(stats);
            this.renderDebtProgressChart(stats);
            this.renderInvestmentTrendChart(stats);
            // After content and charts render, normalize heights
            setTimeout(() => this.adjustSideBySideHeights(), 50);
        }, 50);

        // Setup resize listener to keep heights in sync
        if (this._onResize) window.removeEventListener('resize', this._onResize);
        this._onResize = () => this.adjustSideBySideHeights();
        window.addEventListener('resize', this._onResize);
    }

    calculateStatistics() {
        const planner = dataManager.getData('planner');
        const transactions = dataManager.getData('transactions')?.Transactions || [];
        const debtsPayoff = dataManager.getData('debtsPayoff')?.['Debt Pay-Off'] || [];
        const investments = dataManager.getData('investments')?.Investments || [];
        const categories = dataManager.getData('categories');

        const range = dataManager.getPlanningDateRange();
        const hasRange = !!(range && range.startDate && range.endDate);
        const currency = planner?.Currency || '$';

        // Do NOT filter data for dashboard metrics; use full datasets
        const filteredTransactions = transactions; // intentionally unfiltered
        const filteredDebtsPayoff = debtsPayoff;   // intentionally unfiltered

        // Calculate current holdings
        const currentHoldings = planner?.['Current Holding'] || [];
        const totalHoldings = currentHoldings.reduce((sum, holding) => sum + (holding.Amount || 0), 0);
        const totalInvested = investments.reduce((sum, inv) => sum + (inv.Amount || 0), 0);

        // Calculate planned income and expenses (period-adjusted using planner's logic)
        const plannedIncome = planner?.['Expected Income'] || [];
        const plannedExpenses = planner?.['Planned Expenses'] || [];
        const periodPlannedIncome = (window.plannerManager && typeof plannerManager.calculatePeriodPlanned === 'function')
            ? plannerManager.calculatePeriodPlanned(plannedIncome, range)
            : 0;
        const periodPlannedExpenses = (window.plannerManager && typeof plannerManager.calculatePeriodPlanned === 'function')
            ? plannerManager.calculatePeriodPlanned(plannedExpenses, range)
            : 0;
        const totalPlannedIncome = periodPlannedIncome;
        const totalPlannedExpenses = periodPlannedExpenses;

        // Calculate actual transactions (full dataset)
        const actualIncome = filteredTransactions.filter(t => t.Type === 'Income').reduce((sum, t) => sum + (t.Amount || 0), 0);
        const actualExpenses = filteredTransactions.filter(t => t.Type === 'Expenses').reduce((sum, t) => sum + (t.Amount || 0), 0);

        // To-Date calculations within plan: from plan start to min(today, plan end)
        let planStart, planEnd, toDate, toDateRange, startOfDay, endOfDay;
        if (hasRange) {
            planStart = range.startDate instanceof Date ? range.startDate : new Date(range.startDate);
            planEnd = range.endDate instanceof Date ? range.endDate : new Date(range.endDate);
            const today = new Date();
            toDate = new Date(Math.min(today.getTime(), planEnd.getTime()));
            toDateRange = { startDate: planStart, endDate: toDate };
            // Normalize day boundaries for inclusive to-date filtering
            startOfDay = new Date(planStart.getFullYear(), planStart.getMonth(), planStart.getDate(), 0, 0, 0, 0);
            endOfDay = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);
        }

        const plannedIncomeToDate = (hasRange && window.plannerManager && typeof plannerManager.calculatePeriodPlanned === 'function')
            ? plannerManager.calculatePeriodPlanned(plannedIncome, toDateRange)
            : 0;
        const plannedExpensesToDate = (hasRange && window.plannerManager && typeof plannerManager.calculatePeriodPlanned === 'function')
            ? plannerManager.calculatePeriodPlanned(plannedExpenses, toDateRange)
            : 0;

        const transactionsToDate = hasRange ? filteredTransactions.filter(t => {
            const d = this.parseDate(t.Date);
            return d >= startOfDay && d <= endOfDay;
        }) : [];
        const actualIncomeToDate = transactionsToDate.filter(t => t.Type === 'Income').reduce((sum, t) => sum + (t.Amount || 0), 0);
        const actualExpensesToDate = transactionsToDate.filter(t => t.Type === 'Expenses').reduce((sum, t) => sum + (t.Amount || 0), 0);

        // Prepare Debt Pay-Off category list (lowercased) for matching accounts
        const debtPayoffCategories = (categories?.['Debt Pay-Off'] || []).map(c => (c || '').toLowerCase());

        // Calculate debt payments split by source account
        const totalDebtPayments = filteredDebtsPayoff.reduce((sum, debt) => sum + (debt.Amount || 0), 0);

        // Calculate debt payments (to-date within plan)
        const debtsToDate = filteredDebtsPayoff.filter(d => {
            const dd = this.parseDate(d.Date);
            return dd >= startOfDay && dd <= endOfDay;
        });
        const totalDebtPaymentsToDate = debtsToDate.reduce((sum, d) => sum + (d.Amount || 0), 0);
        // Split debt payments by whether they originate from Debt accounts vs non-Debt (assets)
        const debtPayoffUsingDebt = filteredDebtsPayoff
            .filter(d => debtPayoffCategories.includes(((d['From Account']) || '').toLowerCase()))
            .reduce((sum, d) => sum + (d.Amount || 0), 0);
        const debtPayoffFromAssets = filteredDebtsPayoff
            .filter(d => !debtPayoffCategories.includes(((d['From Account']) || '').toLowerCase()))
            .reduce((sum, d) => sum + (d.Amount || 0), 0);

        // Calculate Current Outstanding = Planner Outstanding + spending using debt accounts (expenses, investments, and debt payoffs funded by debt) − debt repayments from asset accounts
        const plannerOutstanding = planner?.['Current Outstanding'] || [];
        const basePlannerOutstanding = plannerOutstanding.reduce((sum, o) => sum + (o.Amount || 0), 0);
        const expensesUsingDebt = filteredTransactions
            .filter(t => {
                const acct = (t.Account || '').toLowerCase();
                return t.Type === 'Expenses' && debtPayoffCategories.includes(acct);
            })
            .reduce((sum, t) => sum + (t.Amount || 0), 0);
        // Expenses paid from asset accounts (affect holdings)
        const expensesFromAssets = filteredTransactions
            .filter(t => {
                const acct = (t.Account || '').toLowerCase();
                return t.Type === 'Expenses' && !debtPayoffCategories.includes(acct);
            })
            .reduce((sum, t) => sum + (t.Amount || 0), 0);
        // Income received into asset accounts (affect holdings)
        const incomeToAssets = filteredTransactions
            .filter(t => {
                const acct = (t.Account || '').toLowerCase();
                return t.Type === 'Income' && !debtPayoffCategories.includes(acct);
            })
            .reduce((sum, t) => sum + (t.Amount || 0), 0);
        // Investment spendings funded by Debt Pay-Off accounts (total and to-date)
        const investmentsUsingDebt = investments
            .filter(inv => debtPayoffCategories.includes(((inv['From Account']) || '').toLowerCase()))
            .reduce((sum, inv) => sum + (inv.Amount || 0), 0);
        // Investment spendings from asset accounts (affect holdings)
        const investmentsFromAssets = investments
            .filter(inv => !debtPayoffCategories.includes(((inv['From Account']) || '').toLowerCase()))
            .reduce((sum, inv) => sum + (inv.Amount || 0), 0);
        const investmentsUsingDebtToDate = investments
            .filter(inv => {
                const acct = ((inv['From Account']) || '').toLowerCase();
                const dd = this.parseDate(inv.Date);
                return debtPayoffCategories.includes(acct) && dd >= startOfDay && dd <= endOfDay;
            })
            .reduce((sum, inv) => sum + (inv.Amount || 0), 0);
        // Debug: verify debt expense components
        if (window.DEBUG) console.log('Debt components:', { basePlannerOutstanding, expensesUsingDebt, expensesFromAssets, incomeToAssets, investmentsUsingDebt, investmentsFromAssets, investmentsUsingDebtToDate, debtPayoffUsingDebt, debtPayoffFromAssets, totalDebtPayments, debtPayoffCategories });
        // Current Outstanding adds spending done using debt accounts (expenses, investments, and debt payoffs funded by debt), and subtracts only payments from non-debt accounts
        const currentOutstanding = basePlannerOutstanding + expensesUsingDebt + investmentsUsingDebt + debtPayoffUsingDebt - debtPayoffFromAssets;
        // Current Holdings should reflect only asset-account flows: base + income to assets − expenses from assets − debt repayments from assets − investments from assets
        const currentHoldingsCalc = totalHoldings + incomeToAssets - expensesFromAssets - debtPayoffFromAssets - investmentsFromAssets;
        const netWorth = (currentHoldingsCalc) + totalInvested - currentOutstanding;

        // Monthly breakdown (use full transactions dataset)
        const monthlyData = this.calculateMonthlyBreakdown(transactions, plannedIncome, plannedExpenses, range);

        // Period label for display (to date)
        const periodOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        const incomeExpensePeriod = hasRange ? `${(planStart || new Date()).toLocaleDateString('en-US', periodOptions)} - ${(toDate || new Date()).toLocaleDateString('en-US', periodOptions)} (to date)` : 'No planning range set';

        // Budget variance should use To-Date values
        const netPlannedToDate = plannedIncomeToDate - plannedExpensesToDate;
        const netActualToDate = actualIncomeToDate - actualExpensesToDate;

        // Category breakdown (use full transactions dataset)
        const categoryBreakdown = this.calculateCategoryBreakdown(transactions, categories);

        if (window.DEBUG) console.log('Dashboard statistics calculation:', {
            totalPlannedIncome,
            totalPlannedExpenses,
            actualIncome,
            actualExpenses,
            filteredTransactions: filteredTransactions.length,
            plannedIncome: plannedIncome.length,
            plannedExpenses: plannedExpenses.length
        });

        // To-date health indicators
        const savingsRateToDate = actualIncomeToDate > 0 ? ((actualIncomeToDate - actualExpensesToDate) / actualIncomeToDate * 100) : 0;
        const debtToIncomeToDate = actualIncomeToDate > 0 ? (totalDebtPaymentsToDate / actualIncomeToDate * 100) : 0;

        return {
            currency,
            range,
            // Base holdings from planner (sum of Current Holding)
            basePlannerHoldings: totalHoldings,
            // Current Holdings = Base (planner) + Income to Assets − Expenses from Assets − Debt repayments from Assets − Investments from Assets
            currentHoldings: currentHoldingsCalc,
            totalHoldings,
            // Outstanding metrics
            basePlannerOutstanding,
            expensesUsingDebt,
            expensesFromAssets,
            incomeToAssets,
            investmentsUsingDebt,
            investmentsFromAssets,
            investmentsUsingDebtToDate,
            debtPayoffUsingDebt,
            debtPayoffFromAssets,
            currentOutstanding,
            totalPlannedIncome,
            totalPlannedExpenses,
            actualIncome,
            actualExpenses,
            totalDebtPayments,
            totalInvested,
            netWorth,
            monthlyData,
            categoryBreakdown,
            // For card 3 display
            incomeExpensePeriod,
            plannedIncomeToDate,
            actualIncomeToDate,
            plannedExpensesToDate,
            actualExpensesToDate,
            netPlanned: totalPlannedIncome - totalPlannedExpenses,
            netActual: actualIncome - actualExpenses,
            netPlannedToDate,
            netActualToDate,
            savingsRate: actualIncome > 0 ? ((actualIncome - actualExpenses) / actualIncome * 100) : 0,
            debtToIncome: actualIncome > 0 ? (totalDebtPayments / actualIncome * 100) : 0,
            // To-date variants for Health Indicators
            totalDebtPaymentsToDate,
            savingsRateToDate,
            debtToIncomeToDate
        };
    }

    applyDateFilter(data) {
        const dateFilter = window.app?.currentDateFilter;
        if (!dateFilter || (dateFilter.start === '' && dateFilter.end === '')) {
            return data; // No filter applied
        }

        return data.filter(item => {
            const itemDate = this.parseDate(item.Date);
            const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
            const endDate = dateFilter.end ? new Date(dateFilter.end) : null;

            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            return true;
        });
    }

    renderInvestmentTrendChart(stats) {
        const ctx = document.getElementById('investmentsTrendChart');
        if (!ctx) return;

        // Set canvas size explicitly
        ctx.width = 400;
        ctx.height = 300;

        // Destroy previous instance on this canvas if exists
        if (this.charts.investmentsTrend && typeof this.charts.investmentsTrend.destroy === 'function') {
            try { this.charts.investmentsTrend.destroy(); } catch (_) {}
            this.charts.investmentsTrend = null;
        }

        const planner = dataManager.getData('planner');
        const plannedInvestments = planner?.['Planned Investments'] || [];
        const actualInvestments = (dataManager.getData('investments')?.Investments || []);

        // Build monthly planned and actual arrays aligned with stats.monthlyData
        const labels = stats.monthlyData.map(m => m.name);

        // Planned per month using existing monthly planner calculator
        const plannedPerMonth = stats.monthlyData.map(m => {
            // Derive a Date object for the month (use first day of displayed month)
            const [monStr, yearStr] = m.name.split(' ');
            const d = new Date(`${monStr} 1, ${yearStr}`);
            return this.calculateMonthlyPlanned(plannedInvestments, d);
        });

        // Actual investments grouped by month key
        const actualByMonth = {};
        actualInvestments.forEach(inv => {
            const d = this.parseDate(inv.Date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            actualByMonth[key] = (actualByMonth[key] || 0) + (inv.Amount || 0);
        });
        const actualPerMonth = stats.monthlyData.map(m => actualByMonth[m.key] || 0);

        this.charts.investmentsTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Actual Investments',
                        data: actualPerMonth,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#0d6efd',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    },
                    {
                        label: 'Planned Investments',
                        data: plannedPerMonth,
                        borderColor: '#20c997',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.35,
                        pointBackgroundColor: '#20c997',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2.2,
                animation: { duration: 1000 },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => stats.currency + value.toLocaleString()
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { padding: 15, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${stats.currency}${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        }
                    }
                }
            }
        });
    }

    calculatePlannedTotal(items) {
        return items.reduce((sum, item) => {
            const amount = item.Amount || 0;
            const frequency = item.Frequency?.toLowerCase() || 'monthly';

            let multiplier = 1;
            // Important: check 'bi-weekly' before 'weekly' to avoid matching the substring 'weekly'
            if (frequency.includes('bi-weekly')) multiplier = 26;
            else if (frequency.includes('weekly')) multiplier = 52;
            else if (frequency.includes('monthly')) multiplier = 12;
            else if (frequency.includes('quarterly')) multiplier = 4;
            else if (frequency.includes('yearly') || frequency.includes('annually')) multiplier = 1;

            return sum + (amount * multiplier);
        }, 0);
    }

    calculateMonthlyBreakdown(transactions, plannedIncome, plannedExpenses, range) {
        // If no planning range is set, return empty monthly data to avoid errors
        if (!range || !range.startDate || !range.endDate) return [];
        const months = [];
        const currentDate = new Date(range.startDate);

        while (currentDate <= range.endDate) {
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const monthName = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            // Filter transactions for this month
            const monthTransactions = transactions.filter(t => {
                const transDate = this.parseDate(t.Date);
                return transDate.getFullYear() === currentDate.getFullYear() &&
                       transDate.getMonth() === currentDate.getMonth();
            });

            const monthIncome = monthTransactions.filter(t => t.Type === 'Income').reduce((sum, t) => sum + (t.Amount || 0), 0);
            const monthExpenses = monthTransactions.filter(t => t.Type === 'Expenses').reduce((sum, t) => sum + (t.Amount || 0), 0);

            // Calculate planned amounts for this month
            const plannedIncomeMonth = this.calculateMonthlyPlanned(plannedIncome, currentDate);
            const plannedExpensesMonth = this.calculateMonthlyPlanned(plannedExpenses, currentDate);

            months.push({
                key: monthKey,
                name: monthName,
                actualIncome: monthIncome,
                actualExpenses: monthExpenses,
                plannedIncome: plannedIncomeMonth,
                plannedExpenses: plannedExpensesMonth,
                netActual: monthIncome - monthExpenses,
                netPlanned: plannedIncomeMonth - plannedExpensesMonth
            });

            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return months;
    }

    calculateMonthlyPlanned(items, date) {
        return items.reduce((sum, item) => {
            const startDate = this.parseDate(item['Start Date']);
            const endDate = this.parseDate(item['End Date']);

            // Check if this month falls within the item's date range
            if (date >= startDate && date <= endDate) {
                const amount = item.Amount || 0;
                const frequency = item.Frequency?.toLowerCase() || 'monthly';
                // Important: check 'bi-weekly' before 'weekly' to avoid matching the substring 'weekly'
                if (frequency.includes('bi-weekly')) return sum + (amount * 2.17); // Average bi-weekly per month
                else if (frequency.includes('weekly')) return sum + (amount * 4.33); // Average weeks per month
                else if (frequency.includes('monthly')) return sum + amount;
                else if (frequency.includes('quarterly')) return sum + (amount / 3);
                else if (frequency.includes('yearly') || frequency.includes('annually')) return sum + (amount / 12);
            }

            return sum;
        }, 0);
    }

    calculateCategoryBreakdown(transactions, categories) {
        const breakdown = {};

        transactions.forEach(transaction => {
            const category = transaction['Income/Expenses/SubCategory'] || 'Other';
            const type = transaction.Type;
            const amount = transaction.Amount || 0;

            if (!breakdown[category]) {
                breakdown[category] = { income: 0, expenses: 0, net: 0 };
            }

            if (type === 'Income') {
                breakdown[category].income += amount;
            } else if (type === 'Expenses') {
                breakdown[category].expenses += amount;
            }

            breakdown[category].net = breakdown[category].income - breakdown[category].expenses;
        });

        return breakdown;
    }

    renderKeyMetricsCards(stats) {
        const formatCurrency = (amount) => `${stats.currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return `
            <div class="col-md-3 mb-3">
                <div class="card bg-primary text-white h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between flex-grow-1">
                            <div class="d-flex flex-column justify-content-between">
                                <div>
                                    <h6 class="card-title mb-2">Current Holdings</h6>
                                    <h4 class="mb-1">${formatCurrency(stats.currentHoldings)}</h4>
                                </div>
                                <div>
                                    <small class="opacity-75">
                                        Base: ${formatCurrency(stats.basePlannerHoldings || 0)}<br>
                                        + Income to Asset Accounts: ${formatCurrency(stats.incomeToAssets || 0)}<br>
                                        - Expenses from Asset Accounts: ${formatCurrency(stats.expensesFromAssets || 0)}<br>
                                        - Debt Repayments from Asset Accounts: ${formatCurrency(stats.debtPayoffFromAssets || 0)}<br>
                                        - Investments from Asset Accounts: ${formatCurrency(stats.investmentsFromAssets || 0)}
                                    </small>
                                </div>
                            </div>
                            <div class="align-self-center">
                                <i class="bi bi-wallet2 fs-1 opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-danger text-white h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between flex-grow-1">
                            <div class="d-flex flex-column justify-content-between">
                                <div>
                                    <h6 class="card-title mb-2">Current Outstanding</h6>
                                    <h4 class="mb-1">${formatCurrency(stats.currentOutstanding || 0)}</h4>
                                </div>
                                <div>
                                    <small class="opacity-75">
                                        Base: ${formatCurrency(stats.basePlannerOutstanding || 0)}<br>
                                        + Expenses using Debt Accounts: ${formatCurrency(stats.expensesUsingDebt || 0)}<br>
                                        + Investments from Debt Accounts: ${formatCurrency(stats.investmentsUsingDebt || 0)}<br>
                                        + Debt Pay-Off funded by Debt Accounts: ${formatCurrency(stats.debtPayoffUsingDebt || 0)}<br>
                                        - Debt Re-Payments: ${formatCurrency(stats.debtPayoffFromAssets || 0)}
                                    </small>
                                </div>
                            </div>
                            <div class="align-self-center">
                                <i class="bi bi-credit-card fs-1 opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-info text-white h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between flex-grow-1">
                            <div class="d-flex flex-column justify-content-between">
                                <div>
                                    <h6 class="card-title mb-2 d-flex align-items-center justify-content-between" style="gap:8px;">
                                        <span>Income (Planned vs Actual)</span>
                                        <span class="d-flex align-items-center" style="gap:6px;">
                                            <span class="badge bg-light text-dark" title="Actual / Planned × 100">
                                                ${((stats.plannedIncomeToDate || 0) > 0 
                                                    ? ((stats.actualIncomeToDate || 0) / (stats.plannedIncomeToDate || 1) * 100).toFixed(1)
                                                    : 'N/A')}%
                                            </span>
                                            <span class="badge ${((stats.actualIncomeToDate || 0) - (stats.plannedIncomeToDate || 0)) >= 0 ? 'bg-success' : 'bg-warning'}" 
                                                  title="Delta = Actual − Planned">
                                                ${(((stats.actualIncomeToDate || 0) - (stats.plannedIncomeToDate || 0)) >= 0 ? '+' : '−')}
                                                ${(() => { const d = Math.abs((stats.actualIncomeToDate || 0) - (stats.plannedIncomeToDate || 0)); return `${stats.currency}${d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; })()}
                                            </span>
                                        </span>
                                    </h6>
                                    <h4 class="mb-1">${formatCurrency(stats.actualIncomeToDate || 0)}</h4>
                                </div>
                                <div>
                                    <small class="opacity-75">
                                        ${stats.incomeExpensePeriod}<br>
                                        Planned: ${formatCurrency(stats.plannedIncomeToDate || 0)} vs Actual: ${formatCurrency(stats.actualIncomeToDate || 0)}
                                    </small>
                                </div>
                            </div>
                            <div class="align-self-center">
                                <i class="bi bi-clipboard-data fs-1 opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-secondary text-white h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between flex-grow-1">
                            <div class="d-flex flex-column justify-content-between">
                                <div>
                                    <h6 class="card-title mb-2 d-flex align-items-center justify-content-between" style="gap:8px;">
                                        <span>Expenses (Planned vs Actual)</span>
                                        <span class="d-flex align-items-center" style="gap:6px;">
                                            <span class="badge bg-light text-dark" title="Actual / Planned × 100">
                                                ${((stats.plannedExpensesToDate || 0) > 0 
                                                    ? ((stats.actualExpensesToDate || 0) / (stats.plannedExpensesToDate || 1) * 100).toFixed(1)
                                                    : 'N/A')}%
                                            </span>
                                            <span class="badge ${((stats.actualExpensesToDate || 0) - (stats.plannedExpensesToDate || 0)) <= 0 ? 'bg-success' : 'bg-warning'}" 
                                                  title="Delta = Actual − Planned (green is under plan)">
                                                ${(((stats.actualExpensesToDate || 0) - (stats.plannedExpensesToDate || 0)) >= 0 ? '+' : '−')}
                                                ${(() => { const d = Math.abs((stats.actualExpensesToDate || 0) - (stats.plannedExpensesToDate || 0)); return `${stats.currency}${d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; })()}
                                            </span>
                                        </span>
                                    </h6>
                                    <h4 class="mb-1">${formatCurrency(stats.actualExpensesToDate || 0)}</h4>
                                </div>
                                <div>
                                    <small class="opacity-75">
                                        ${stats.incomeExpensePeriod}<br>
                                        Planned: ${formatCurrency(stats.plannedExpensesToDate || 0)} vs Actual: ${formatCurrency(stats.actualExpensesToDate || 0)}
                                    </small>
                                </div>
                            </div>
                            <div class="align-self-center">
                                <i class="bi bi-receipt fs-1 opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCategoryAnalysis(stats) {
        const categories = Object.entries(stats.categoryBreakdown)
            .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net))
            .slice(0, 10); // Top 10 categories

        const formatCurrency = (amount) => `${stats.currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return `
            <div class="table-responsive">
                <table class="table table-striped table-sm">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th class="text-end">Income</th>
                            <th class="text-end">Expenses</th>
                            <th class="text-end">Net</th>
                            <th>Impact</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categories.map(([category, data]) => {
                            const netClass = data.net >= 0 ? 'text-success' : 'text-danger';
                            const impactWidth = Math.min(Math.abs(data.net) / Math.max(...categories.map(c => Math.abs(c[1].net))) * 100, 100);
                            const impactColor = data.net >= 0 ? 'bg-success' : 'bg-danger';

                            return `
                                <tr>
                                    <td><strong>${category}</strong></td>
                                    <td class="text-end text-success">${data.income > 0 ? formatCurrency(data.income) : '-'}</td>
                                    <td class="text-end text-danger">${data.expenses > 0 ? formatCurrency(data.expenses) : '-'}</td>
                                    <td class="text-end ${netClass}"><strong>${data.net >= 0 ? '+' : '-'}${formatCurrency(data.net)}</strong></td>
                                    <td>
                                        <div class="progress" style="height: 20px;">
                                            <div class="progress-bar ${impactColor}" style="width: ${impactWidth}%"></div>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Ensure Category Analysis shows all 10 rows without scroll and match Net Worth height
    adjustSideBySideHeights() {
        try {
            const catBody = document.getElementById('categoryAnalysisBody');
            const netBody = document.getElementById('netWorthBody');
            if (!catBody || !netBody) return;

            // Reset to natural height to measure accurately
            catBody.style.height = 'auto';
            netBody.style.height = 'auto';

            // Measure the required height to display all rows (including paddings)
            const buffer = 12; // extra pixels to avoid any clipping due to rounding/fonts
            const target = Math.ceil(catBody.scrollHeight + buffer);

            // Apply equal heights
            catBody.style.overflow = 'hidden';
            catBody.style.height = `${target}px`;
            netBody.style.height = `${target}px`;
        } catch (e) {
            console.warn('adjustSideBySideHeights failed', e);
        }
    }

    renderCharts(stats) {
        // Destroy existing charts more thoroughly
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};

        // Also destroy any existing Chart.js instances on these canvases
        const canvasIds = ['cashFlowChart', 'balanceTrendChart', 'debtProgressChart', 'investmentsTrendChart'];
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                // Get Chart.js instance if it exists
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            }
        });

        // Small delay to ensure cleanup is complete
        setTimeout(() => {
            // Net Worth Stats (textual panel)
            this.renderNetWorthStats(stats);

            // Monthly Cash Flow Chart
            this.renderCashFlowChart(stats);

            // Balance Trend Chart
            this.renderBalanceTrendChart(stats);

            // Debt Progress Chart
            this.renderDebtProgressChart(stats);

            // Investments Trend Chart
            this.renderInvestmentTrendChart(stats);
        }, 50);
    }

    renderNetWorthStats(stats) {
        const container = document.getElementById('netWorthStats');
        if (!container) return;

        const format = (v) => `${stats.currency}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const net = (stats.currentHoldings || 0) + (stats.totalInvested || 0) - (stats.currentOutstanding || 0);

        container.innerHTML = `
            <div class="row g-3">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold">Net Worth</span>
                        <span class="fs-4 fw-bold ${net >= 0 ? 'text-success' : 'text-danger'}">${format(net)}</span>
                    </div>
                    <small class="text-muted">Calculated as (Current Holdings + Investments − Current Outstanding)</small>
                </div>
                <div class="col-12"><hr class="my-2"></div>
                <div class="col-12 d-flex justify-content-between">
                    <span>Current Holdings</span>
                    <span class="fw-semibold">${format(stats.currentHoldings || 0)}</span>
                </div>
                <div class="col-12 d-flex justify-content-between">
                    <span>Investments (Total)</span>
                    <span class="fw-semibold">${format(stats.totalInvested || 0)}</span>
                </div>
                <div class="col-12 d-flex justify-content-between">
                    <span>Current Outstanding</span>
                    <span class="fw-semibold text-danger">${format(stats.currentOutstanding || 0)}</span>
                </div>
                <div class="col-12"><hr class="my-2"></div>
                <div class="col-12">
                    <div class="mb-2">Allocation</div>
                    ${(() => {
                        const holdings = Math.max(0, stats.currentHoldings || 0);
                        const invest = Math.max(0, stats.totalInvested || 0);
                        const total = holdings + invest || 1;
                        const hPct = Math.round(holdings / total * 100);
                        const iPct = 100 - hPct;
                        return `
                            <div class="progress" style="height: 16px;">
                                <div class="progress-bar bg-primary" role="progressbar" style="width: ${hPct}%">Holdings ${hPct}%</div>
                                <div class="progress-bar bg-info" role="progressbar" style="width: ${iPct}%">Investments ${iPct}%</div>
                            </div>
                        `;
                    })()}
                </div>
            </div>
        `;
    }

    renderCashFlowChart(stats) {
        const ctx = document.getElementById('cashFlowChart');
        if (!ctx) return;

        // Set canvas size explicitly
        ctx.width = 400;
        ctx.height = 300;

        // Destroy previous instance on this canvas if exists
        if (this.charts.cashFlow && typeof this.charts.cashFlow.destroy === 'function') {
            try { this.charts.cashFlow.destroy(); } catch (_) {}
            this.charts.cashFlow = null;
        }

        this.charts.cashFlow = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.monthlyData.map(m => m.name),
                datasets: [
                    {
                        label: 'Actual Income',
                        data: stats.monthlyData.map(m => m.actualIncome),
                        backgroundColor: '#28a745',
                        borderColor: '#28a745',
                        borderWidth: 1,
                        type: 'bar'
                    },
                    {
                        label: 'Actual Expenses',
                        data: stats.monthlyData.map(m => m.actualExpenses),
                        backgroundColor: '#dc3545',
                        borderColor: '#dc3545',
                        borderWidth: 1,
                        type: 'bar'
                    },
                    {
                        label: 'Planned Income',
                        data: stats.monthlyData.map(m => m.plannedIncome),
                        borderColor: '#17a2b8',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        type: 'line',
                        tension: 0.4,
                        pointBackgroundColor: '#17a2b8',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    },
                    {
                        label: 'Planned Expenses',
                        data: stats.monthlyData.map(m => m.plannedExpenses),
                        borderColor: '#ffc107',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        type: 'line',
                        tension: 0.4,
                        pointBackgroundColor: '#ffc107',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2.2,
                animation: {
                    duration: 1000
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return stats.currency + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${stats.currency}${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderBalanceTrendChart(stats) {
        const ctx = document.getElementById('balanceTrendChart');
        if (!ctx) return;

        // Set canvas size explicitly
        ctx.width = 400;
        ctx.height = 300;

        // Destroy previous instance on this canvas if exists
        if (this.charts.balanceTrend && typeof this.charts.balanceTrend.destroy === 'function') {
            try { this.charts.balanceTrend.destroy(); } catch (_) {}
            this.charts.balanceTrend = null;
        }

        // Calculate running balance
        let runningBalance = stats.totalHoldings;
        const balanceData = [];

        stats.monthlyData.forEach(month => {
            runningBalance += month.netActual;
            balanceData.push(runningBalance);
        });

        this.charts.balanceTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: stats.monthlyData.map(m => m.name),
                datasets: [{
                    label: 'Account Balance',
                    data: balanceData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2.2,
                animation: {
                    duration: 1000
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return stats.currency + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const i = context.dataIndex;
                                const curr = context.parsed.y || 0;
                                let prev;
                                if (i === 0) {
                                    prev = stats.totalHoldings || 0;
                                } else {
                                    prev = (context.dataset.data?.[i - 1]) ?? curr;
                                }
                                const delta = curr - prev;
                                const sign = delta >= 0 ? '+' : '−';
                                const absDelta = Math.abs(delta);
                                return `Balance: ${stats.currency}${curr.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Δ ${sign}${stats.currency}${absDelta.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderDebtProgressChart(stats) {
        const ctx = document.getElementById('debtProgressChart');
        if (!ctx) return;

        // Set canvas size explicitly
        ctx.width = 400;
        ctx.height = 300;

        // Destroy previous instance on this canvas if exists
        if (this.charts.debtProgress && typeof this.charts.debtProgress.destroy === 'function') {
            try { this.charts.debtProgress.destroy(); } catch (_) {}
            this.charts.debtProgress = null;
        }

        // Get debt payoff data
        const debtsPayoff = dataManager.getData('debtsPayoff')?.['Debt Pay-Off'] || [];
        const debtByMonth = {};

        // Group debt payments by month
        debtsPayoff.forEach(debt => {
            const date = this.parseDate(debt.Date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!debtByMonth[monthKey]) {
                debtByMonth[monthKey] = 0;
            }
            debtByMonth[monthKey] += debt.Amount || 0;
        });

        const months = stats.monthlyData.map(m => m.name);
        const debtPayments = stats.monthlyData.map(m => debtByMonth[m.key] || 0);

        this.charts.debtProgress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Debt Payments',
                    data: debtPayments,
                    backgroundColor: '#fd7e14',
                    borderColor: '#fd7e14',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2.2,
                animation: {
                    duration: 1000
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return stats.currency + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Debt Payment: ${stats.currency}${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Initialize dashboard manager
window.dashboardManager = new DashboardManager();
