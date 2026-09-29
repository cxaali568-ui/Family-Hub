import { Expense, FamilyBudget, ExpenseSummary, MonthlyExpenseReport } from '../types';

class ExpenseReportService {
  /**
   * Calculates comprehensive monthly financial metrics with safe arithmetic.
   */
  calculateMonthSummary(
    expenses: Expense[],
    budget: FamilyBudget | null,
    monthKey: string
  ): ExpenseSummary {
    // Only non-deleted expenses for the designated monthKey
    const validExpenses = expenses.filter(
      (e) => !e.deletedAt && e.monthKey === monthKey
    );

    // Sum using minor units (integer cents/paisas) to eliminate floating point imprecision
    let totalMinor = 0;
    validExpenses.forEach((e) => {
      const minor = e.amountMinor !== undefined ? e.amountMinor : Math.round(Number(e.amount || 0) * 100);
      totalMinor += minor;
    });

    const totalSpent = totalMinor / 100;
    const transactionCount = validExpenses.length;

    // Determine days elapsed for daily average
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    let daysForAverage: number;
    if (year === currentYear && month === currentMonth) {
      daysForAverage = Math.max(1, currentDay);
    } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
      daysForAverage = Math.max(1, daysInMonth);
    } else {
      daysForAverage = 1;
    }

    const dailyAverage = Math.round((totalSpent / daysForAverage) * 100) / 100;
    const averageTransaction =
      transactionCount > 0 ? Math.round((totalSpent / transactionCount) * 100) / 100 : 0;

    // Budget computations
    const budgetAmount = budget ? budget.amount : 0;
    const remainingBudget = budgetAmount > 0 ? Math.round((budgetAmount - totalSpent) * 100) / 100 : 0;
    const budgetUsagePercentage =
      budgetAmount > 0 ? Math.round((totalSpent / budgetAmount) * 1000) / 10 : 0;

    let budgetStatus: ExpenseSummary['budgetStatus'] = 'normal';
    if (budgetAmount > 0) {
      if (totalSpent > budgetAmount) {
        budgetStatus = 'exceeded';
      } else if (totalSpent === budgetAmount) {
        budgetStatus = 'reached';
      } else if (budgetUsagePercentage >= 80) {
        budgetStatus = 'warning';
      }
    }

    // Largest single expense
    let largestExpense: Expense | null = null;
    let maxAmount = 0;
    validExpenses.forEach((e) => {
      if (e.amount > maxAmount) {
        maxAmount = e.amount;
        largestExpense = e;
      }
    });

    // Category Totals
    const catMap = new Map<string, { categoryId: string; categoryName: string; icon?: string; totalMinor: number; count: number }>();
    validExpenses.forEach((e) => {
      const catKey = e.categoryId || e.categoryName || 'other';
      const existing = catMap.get(catKey) || {
        categoryId: catKey,
        categoryName: e.categoryName || 'Other',
        icon: e.categoryIcon,
        totalMinor: 0,
        count: 0,
      };
      existing.totalMinor += e.amountMinor !== undefined ? e.amountMinor : Math.round(e.amount * 100);
      existing.count += 1;
      if (!existing.icon && e.categoryIcon) existing.icon = e.categoryIcon;
      catMap.set(catKey, existing);
    });

    const categoryTotals = Array.from(catMap.values())
      .map((item) => {
        const amount = item.totalMinor / 100;
        const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0;
        return {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          icon: item.icon,
          amount,
          percentage,
          count: item.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Payer Totals
    const payerMap = new Map<string, { payerName: string; memberId?: string; totalMinor: number; count: number }>();
    validExpenses.forEach((e) => {
      const pKey = e.paidByName?.trim() || 'Not specified';
      const existing = payerMap.get(pKey) || {
        payerName: pKey,
        memberId: e.paidByMemberId,
        totalMinor: 0,
        count: 0,
      };
      existing.totalMinor += e.amountMinor !== undefined ? e.amountMinor : Math.round(e.amount * 100);
      existing.count += 1;
      payerMap.set(pKey, existing);
    });

    const payerTotals = Array.from(payerMap.values())
      .map((item) => {
        const amount = item.totalMinor / 100;
        const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0;
        return {
          payerName: item.payerName,
          memberId: item.memberId,
          amount,
          percentage,
          count: item.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Person Totals ('For Person')
    const personMap = new Map<string, { personName: string; memberId?: string; totalMinor: number; count: number }>();
    validExpenses.forEach((e) => {
      const pKey = e.forPersonName?.trim() || 'Family';
      const existing = personMap.get(pKey) || {
        personName: pKey,
        memberId: e.forMemberId,
        totalMinor: 0,
        count: 0,
      };
      existing.totalMinor += e.amountMinor !== undefined ? e.amountMinor : Math.round(e.amount * 100);
      existing.count += 1;
      personMap.set(pKey, existing);
    });

    const personTotals = Array.from(personMap.values())
      .map((item) => {
        const amount = item.totalMinor / 100;
        const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0;
        return {
          personName: item.personName,
          memberId: item.memberId,
          amount,
          percentage,
          count: item.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Daily Totals for the month
    const dailyMap = new Map<string, { totalMinor: number; count: number }>();
    validExpenses.forEach((e) => {
      const dKey = e.expenseDate; // YYYY-MM-DD
      const existing = dailyMap.get(dKey) || { totalMinor: 0, count: 0 };
      existing.totalMinor += e.amountMinor !== undefined ? e.amountMinor : Math.round(e.amount * 100);
      existing.count += 1;
      dailyMap.set(dKey, existing);
    });

    const dailyTotals: ExpenseSummary['dailyTotals'] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = dailyMap.get(dateStr) || { totalMinor: 0, count: 0 };
      dailyTotals.push({
        date: dateStr,
        dayLabel: `${day} ${new Date(year, month - 1, day).toLocaleDateString([], { month: 'short' })}`,
        amount: entry.totalMinor / 100,
        count: entry.count,
      });
    }

    // Payment Method Breakdown
    const methodMap = new Map<string, { totalMinor: number; count: number }>();
    validExpenses.forEach((e) => {
      const mKey = e.paymentMethod || 'Cash';
      const existing = methodMap.get(mKey) || { totalMinor: 0, count: 0 };
      existing.totalMinor += e.amountMinor !== undefined ? e.amountMinor : Math.round(e.amount * 100);
      existing.count += 1;
      methodMap.set(mKey, existing);
    });

    const paymentMethodTotals = Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method,
        amount: data.totalMinor / 100,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      monthKey,
      totalSpent,
      transactionCount,
      dailyAverage,
      averageTransaction,
      budgetAmount,
      remainingBudget,
      budgetUsagePercentage,
      budgetStatus,
      largestExpense,
      categoryTotals,
      payerTotals,
      personTotals,
      dailyTotals,
      paymentMethodTotals,
    };
  }

  /**
   * Exports the monthly report to a clean, well-formatted CSV file.
   */
  exportToCSV(report: MonthlyExpenseReport): void {
    const { familyName, currency, monthLabel, expenses, summary } = report;

    const rows: string[][] = [];

    // Header Meta
    rows.push([`FamilyHub - Monthly Expense Report`]);
    rows.push([`Family:`, `"${familyName}"`]);
    rows.push([`Reporting Period:`, `"${monthLabel}"`]);
    rows.push([`Total Spent:`, `"${currency} ${summary.totalSpent.toLocaleString()}"`]);
    rows.push([`Transactions:`, `${summary.transactionCount}`]);
    rows.push([`Daily Average:`, `"${currency} ${summary.dailyAverage.toLocaleString()}"`]);
    if (summary.budgetAmount > 0) {
      rows.push([`Budget:`, `"${currency} ${summary.budgetAmount.toLocaleString()}"`]);
      rows.push([`Remaining:`, `"${currency} ${summary.remainingBudget.toLocaleString()}"`]);
    }
    rows.push([]); // blank line

    // Category Breakdown Section
    rows.push([`Category Breakdown`]);
    rows.push([`Category`, `Total (${currency})`, `Percentage`, `Transactions`]);
    summary.categoryTotals.forEach((cat) => {
      rows.push([`"${cat.categoryName}"`, `${cat.amount}`, `${cat.percentage}%`, `${cat.count}`]);
    });
    rows.push([]);

    // Detailed Transactions
    rows.push([`Detailed Transactions`]);
    rows.push([
      'Date',
      'Description',
      'Category',
      `Amount (${currency})`,
      'Paid By',
      'For Person',
      'Payment Method',
      'Time',
      'Notes',
    ]);

    expenses
      .filter((e) => !e.deletedAt)
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
      .forEach((e) => {
        rows.push([
          `"${e.expenseDate}"`,
          `"${(e.description || '').replace(/"/g, '""')}"`,
          `"${(e.categoryName || '').replace(/"/g, '""')}"`,
          `${e.amount}`,
          `"${(e.paidByName || '').replace(/"/g, '""')}"`,
          `"${(e.forPersonName || '').replace(/"/g, '""')}"`,
          `"${(e.paymentMethod || '').replace(/"/g, '""')}"`,
          `"${(e.expenseTime || '').replace(/"/g, '""')}"`,
          `"${(e.notes || '').replace(/"/g, '""')}"`,
        ]);
      });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeFamily = familyName.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `${safeFamily}_Expenses_${report.summary.monthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Prepares and triggers printable report view
   */
  printReport(): void {
    window.print();
  }
}

export const expenseReportService = new ExpenseReportService();
