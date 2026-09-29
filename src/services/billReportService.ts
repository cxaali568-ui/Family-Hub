import { Bill, BillSummary, MonthlyBillReport } from '../types';

class BillReportService {
  /**
   * Computes comprehensive monthly billing summary with accurate integer arithmetic.
   */
  calculateBillSummary(
    bills: Bill[],
    monthKey: string,
    upcomingDaysWindow: number = 7
  ): BillSummary {
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter month bills: bills due in this monthKey
    const monthBills = bills.filter(
      (b) => b.billingMonthKey === monthKey && b.status !== 'Cancelled'
    );

    let totalExpectedMinor = 0;
    let totalPaidMinor = 0;
    let totalPendingMinor = 0;
    let totalOverdueMinor = 0;
    let totalCancelledMinor = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    // Monthly bills tally
    monthBills.forEach((b) => {
      const amtMinor = b.amountMinor || Math.round(b.amount * 100);
      const paidMinor = Math.round((b.paidAmount || 0) * 100);
      const remMinor = Math.max(0, amtMinor - paidMinor);

      totalExpectedMinor += amtMinor;
      totalPaidMinor += paidMinor;

      if (b.status === 'Paid') {
        paidCount += 1;
      } else if (b.status === 'Overdue') {
        totalOverdueMinor += remMinor;
        overdueCount += 1;
      } else {
        totalPendingMinor += remMinor;
        pendingCount += 1;
      }
    });

    // Also include any active bills from any month that are Overdue (Section 26: "Do not hide overdue bills")
    const allOverdueBills = bills.filter(
      (b) => b.status === 'Overdue'
    );

    // Cancelled bills for this month
    const cancelledBills = bills.filter(
      (b) => b.billingMonthKey === monthKey && b.status === 'Cancelled'
    );
    cancelledBills.forEach((b) => {
      totalCancelledMinor += b.amountMinor || Math.round(b.amount * 100);
    });

    // Bills due Today (Section 27)
    const todayBills = bills.filter(
      (b) => b.dueDate === todayStr && b.status !== 'Cancelled' && b.status !== 'Paid'
    );

    // Upcoming Bills within window (Section 25)
    const maxUpcomingDate = new Date();
    maxUpcomingDate.setDate(maxUpcomingDate.getDate() + upcomingDaysWindow);
    const maxUpcomingStr = maxUpcomingDate.toISOString().split('T')[0];

    const upcomingBills = bills
      .filter(
        (b) =>
          b.dueDate >= todayStr &&
          b.dueDate <= maxUpcomingStr &&
          b.status !== 'Cancelled' &&
          b.status !== 'Paid'
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // Bills by Type Breakdown (Section 32, 49)
    const typeMap = new Map<string, { billTypeId: string; billTypeName: string; icon?: string; totalMinor: number; count: number }>();
    monthBills.forEach((b) => {
      const tKey = b.billTypeId || b.billTypeName;
      const existing = typeMap.get(tKey) || {
        billTypeId: tKey,
        billTypeName: b.billTypeName,
        icon: b.billTypeIcon,
        totalMinor: 0,
        count: 0,
      };
      existing.totalMinor += b.amountMinor || Math.round(b.amount * 100);
      existing.count += 1;
      typeMap.set(tKey, existing);
    });

    const totalExpected = totalExpectedMinor / 100;
    const billsByType = Array.from(typeMap.values())
      .map((item) => {
        const amount = item.totalMinor / 100;
        const percentage = totalExpected > 0 ? Math.round((amount / totalExpected) * 1000) / 10 : 0;
        return {
          billTypeId: item.billTypeId,
          billTypeName: item.billTypeName,
          icon: item.icon,
          amount,
          count: item.count,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const [yearStr, monthStr] = monthKey.split('-');
    const monthDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    const monthLabel = monthDate.toLocaleDateString([], { month: 'long', year: 'numeric' });

    return {
      monthKey,
      monthLabel,
      totalExpected,
      totalPaid: totalPaidMinor / 100,
      totalPending: totalPendingMinor / 100,
      totalOverdue: totalOverdueMinor / 100,
      totalCancelled: totalCancelledMinor / 100,
      billCount: monthBills.length,
      paidCount,
      pendingCount,
      overdueCount,
      billsByType,
      todayBills,
      upcomingBills,
      overdueBills: allOverdueBills,
    };
  }

  /**
   * Exports monthly bills report to a clean, well-formatted CSV file.
   */
  exportToCSV(report: MonthlyBillReport): void {
    const { familyName, currency, monthLabel, bills, summary } = report;

    const rows: string[][] = [];

    // Header Meta
    rows.push([`FamilyHub - Monthly Bills Report`]);
    rows.push([`Family:`, `"${familyName}"`]);
    rows.push([`Reporting Period:`, `"${monthLabel}"`]);
    rows.push([`Total Expected:`, `"${currency} ${summary.totalExpected.toLocaleString()}"`]);
    rows.push([`Total Paid:`, `"${currency} ${summary.totalPaid.toLocaleString()}"`]);
    rows.push([`Total Pending:`, `"${currency} ${summary.totalPending.toLocaleString()}"`]);
    rows.push([`Total Overdue:`, `"${currency} ${summary.totalOverdue.toLocaleString()}"`]);
    rows.push([]);

    // Bill Type Breakdown Section
    rows.push([`Bills Breakdown by Type`]);
    rows.push([`Type`, `Amount (${currency})`, `Percentage`, `Count`]);
    summary.billsByType.forEach((t) => {
      rows.push([`"${t.billTypeName}"`, `${t.amount}`, `${t.percentage}%`, `${t.count}`]);
    });
    rows.push([]);

    // Detailed Bill Records
    rows.push([`Detailed Bills List`]);
    rows.push([
      'Bill Type',
      'Provider',
      'Due Date',
      `Amount (${currency})`,
      `Paid Amount (${currency})`,
      `Remaining (${currency})`,
      'Status',
      'Recurring',
      'Account Number',
      'Latest Payment Date',
    ]);

    bills
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .forEach((b) => {
        rows.push([
          `"${b.billTypeName}"`,
          `"${(b.providerName || '').replace(/"/g, '""')}"`,
          `"${b.dueDate}"`,
          `${b.amount}`,
          `${b.paidAmount || 0}`,
          `${b.remainingAmount || 0}`,
          `"${b.status}"`,
          `"${b.isRecurringInstance ? 'Yes' : 'No'}"`,
          `"${b.accountNumberMasked || 'N/A'}"`,
          `"${b.latestPaymentDate || 'Unpaid'}"`,
        ]);
      });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeFamily = familyName.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `${safeFamily}_Bills_${report.summary.monthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printReport(): void {
    window.print();
  }
}

export const billReportService = new BillReportService();
