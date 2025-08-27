# Financial Management System

A comprehensive, responsive web application for managing personal finances built with HTML, CSS, JavaScript, and Bootstrap 5.

## Features

### 📊 Dashboard
- **Key Metrics**: Current Holdings, Current Outstanding (with detailed breakdown), Net Worth, totals to date
- **Interactive Charts**:
  - Monthly Cash Flow (Income vs Expenses)
  - Account Balances Trend
  - Debt Payoff Progress
  - Investments: Planned vs Actual (new)
- **Analysis Panels**:
  - Category Analysis (Top 10 categories, no scrollbar)
  - Net Worth Overview (aligned height with Category Analysis)
- **Planner Awareness**: All stats/charts respect the rolling planning period using robust date parsing
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### 🏷️ Categories Management
- **CRUD Operations** for:
  - Currencies (with symbol and currency code)
  - Income categories
  - Expense categories
  - Account types
  - Debt pay-off categories
  - Investment types
- **Quick Stats**: View usage statistics for each category
- **Tabbed Interface**: Easy navigation between different category types

### 📅 Financial Planner
- **Planner Settings**: Configure start date and default currency
- **Current Holdings**: Track account balances
- **Current Outstanding**: Monitor debt amounts
- **Expected Income**: Plan recurring income with frequency settings
- **Planned Expenses**: Budget for recurring expenses
- **Summary Views**: Total amounts and frequency breakdowns

### 💳 Transactions
- **Transaction Management**: Record income and expense transactions
- **Debt Pay-off Tracking**: Monitor debt payments between accounts
- **Category Integration**: Automatically populate categories from your settings
- **Date Filtering**: View transactions for specific periods
- **Summary Statistics**: Real-time totals and net calculations

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5.3.2
- **Icons**: Bootstrap Icons
- **Charts**: Chart.js
- **Data Storage**: LocalStorage (with JavaScript object initialization)

## File Structure

```
├── index.html              # Main application file
├── css/
│   └── styles.css          # Custom styling and responsive design
├── js/
│   ├── app.js             # Main application controller
│   ├── data-manager.js    # Data operations and storage
│   ├── dashboard.js       # Dashboard functionality and charts (incl. Investments trend)
│   ├── categories.js      # Categories management
│   ├── planner.js         # Financial planning features
│   └── transactions.js    # Transaction management
└── sampledata/
    ├── categories.js      # Category definitions
    ├── planner.js         # Planning data
    ├── transactions.js    # Transaction records
    ├── debts-payoff.js    # Debt payment records
    └── investments.js     # Investments data (actuals)
```

## Getting Started

1. **Clone or download** the project files
2. **Open** `index.html` in a modern web browser
3. **Start using** the application immediately - no installation required!

### Initial Setup

1. **Configure Categories**: Go to the Categories page to set up your income sources, expense categories, accounts, and currencies
2. **Set Planner Settings**: Configure your start date and default currency in the Planner page
3. **Add Initial Data**: Enter your current account balances and outstanding debts
4. **Start Recording**: Begin adding transactions and tracking your finances

## Features in Detail

### Dashboard Analytics
- **Real-time Calculations**: All summaries and charts update automatically as you add data
- **Planning Period Alignment**: Calculations respect the configured planner start date and use inclusive date boundaries
- **Visual Insights**: Charts help identify cash flow, balances, debt reduction, and investment adherence

#### Investments: Planned vs Actual (New)
- Compares monthly planned investments (from `sampledata/planner.js` → `Planned Investments`) vs actual investments (from `sampledata/investments.js` → `Investments`).
- Appears in the top-left chart spot; legend distinguishes Planned vs Actual.
- Uses the same monthly labeling as other charts to keep periods aligned.

#### Category Analysis (Top 10)
- Shows the top 10 categories by net impact without a scrollbar.
- Layout ensures all 10 rows are visible. The Net Worth Overview card matches its height.

### Data Management
- **Local Storage**: All changes are automatically saved to your browser's local storage
- **Data Persistence**: Your data persists between browser sessions
- **Import/Export**: JSON structure allows for easy data backup and migration

### Responsive Design
- **Mobile-First**: Optimized for mobile devices with touch-friendly interfaces
- **Tablet Support**: Adapted layouts for tablet viewing
- **Desktop Experience**: Full-featured interface for desktop users

## Browser Compatibility

- **Chrome** 80+
- **Firefox** 75+
- **Safari** 13+
- **Edge** 80+

## Data Privacy

- **Local Storage Only**: All data is stored locally in your browser
- **No Server Communication**: No data is sent to external servers, no fetch API calls
- **Complete Privacy**: Your financial data never leaves your device
- **Pure Client-Side**: Works entirely with JavaScript objects, no server required

## Customization

The application is built with modularity in mind:

- **CSS Variables**: Easy color scheme customization in `css/styles.css`
- **Modular JavaScript**: Each feature is in its own module for easy modification
- **Bootstrap Classes**: Leverage Bootstrap's utility classes for quick styling changes

## Future Enhancements

Potential features for future versions:
- Data export/import functionality
- Budget planning and tracking
- Investment portfolio tracking
- Multi-currency support with exchange rates
- Recurring transaction automation
- Advanced reporting and analytics

## Support

This is a static web application that runs entirely in your browser. For issues or questions:
1. Check the browser console for any error messages
2. Ensure you're using a modern, supported browser
3. Clear browser cache if experiencing issues

## License
Third-party libraries and attributions are listed in `THIRD_PARTY_NOTICES.md`.
