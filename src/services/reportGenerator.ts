import { format } from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import type { Language } from '@/types';

interface ReportData {
  financial: any;
  service: any[];
  staff: any[];
  inventory: any[];
  dateRange: { from: Date; to: Date } | undefined;
  storeName?: string;
}

// ─── HTML/Print-based generator (supports Arabic correctly) ──────────────────
const generateHTMLReport = (data: ReportData, language: Language) => {
  const isAr = language === 'ar';
  const locale = isAr ? ar : fr;
  const dir = isAr ? 'rtl' : 'ltr';
  const storeName = data.storeName || 'Caisse Xpress';

  const dateStr = data.dateRange?.from && data.dateRange?.to
    ? `${format(data.dateRange.from, 'dd MMM yyyy', { locale })} - ${format(data.dateRange.to, 'dd MMM yyyy', { locale })}`
    : format(new Date(), 'dd MMM yyyy', { locale });

  const totalRevenue = data.financial?.totalRevenue || 0;
  const totalProfit = data.financial?.totalProfit || 0;
  const totalTx = data.financial?.totalTransactions || 0;

  const t = {
    title: isAr ? 'التقرير الشامل' : 'Rapport Complet',
    period: isAr ? 'الفترة' : 'Période',
    summary: isAr ? 'ملخص الأداء' : 'Résumé Exécutif',
    revenue: isAr ? 'الإيرادات' : 'Revenus',
    profit: isAr ? 'الأرباح (تقديري)' : 'Profit (Est.)',
    transactions: isAr ? 'المعاملات' : 'Transactions',
    financial: isAr ? 'التفاصيل المالية' : 'Détails Financiers',
    month: isAr ? 'الشهر' : 'Mois',
    expenses: isAr ? 'المصروفات' : 'Dépenses',
    staffTitle: isAr ? 'أداء الموظفين' : 'Performance du Personnel',
    staff: isAr ? 'الموظف' : 'Staff',
    clients: isAr ? 'العملاء' : 'Clients',
    trans: isAr ? 'المعاملات' : 'Trans.',
    inventory: isAr ? 'حالة المخزون' : 'État du Stock',
    product: isAr ? 'المنتج' : 'Produit',
    stock: isAr ? 'المخزون' : 'Stock',
    minStock: isAr ? 'الحد الأدنى' : 'Min.',
    price: isAr ? 'السعر' : 'Prix',
    page: isAr ? 'صفحة' : 'Page',
  };

  const finRows = (data.financial?.monthlyRevenue || []).map((row: any) => `
        <tr>
            <td>${row.month}</td>
            <td>${row.revenue.toLocaleString()} DZD</td>
            <td>${row.expenses.toLocaleString()} DZD</td>
            <td>${row.profit.toLocaleString()} DZD</td>
        </tr>`).join('');

  const staffRows = (data.staff || []).map((row: any) => `
        <tr>
            <td>${row.name}</td>
            <td>${row.revenue.toLocaleString()} DZD</td>
            <td>${row.clients}</td>
            <td>${row.transactions}</td>
        </tr>`).join('');

  const invRows = (data.inventory || []).map((row: any) => {
    const lowStock = row.stock <= row.minStock;
    return `<tr class="${lowStock ? 'low-stock' : ''}">
            <td><b>${row.name}</b></td>
            <td>${row.stock}</td>
            <td>${row.minStock}</td>
            <td>${row.price.toLocaleString()} DZD</td>
        </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="UTF-8"/>
  <title>${t.title} - ${storeName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&family=Inter:wght@400;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${isAr ? "'Noto Sans Arabic'" : "'Inter'"}, sans-serif;
      direction: ${dir};
      color: #1e293b;
      background: #fff;
      font-size: 13px;
      line-height: 1.6;
    }

    .header {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 20px; font-weight: 700; }
    .header .period { font-size: 12px; opacity: 0.85; }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f766e;
      border-bottom: 2px solid #d1fae5;
      padding-bottom: 6px;
      margin: 24px 0 12px;
    }

    .cards {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      flex-direction: ${isAr ? 'row-reverse' : 'row'};
    }
    .card {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      background: #f8fafc;
    }
    .card .label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .card .value { font-size: 18px; font-weight: 700; color: #10b981; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 8px;
    }
    thead tr { background: #10b981; color: white; }
    thead th { padding: 8px 12px; text-align: ${isAr ? 'right' : 'left'}; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f1f5f9; }
    tbody tr.low-stock { background: #fff1f2; color: #be123c; }
    tbody td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }

    .staff-head thead tr { background: #f43f5e; }
    .inv-head thead tr { background: #334155; }

    .footer {
      margin-top: 32px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { -webkit-print-color-adjust: exact; }
      thead tr { -webkit-print-color-adjust: exact; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h1>${storeName} — ${t.title}</h1>
      <div class="period">${t.period}: ${dateStr}</div>
    </div>
  </div>

  <div class="section-title">${t.summary}</div>
  <div class="cards">
    <div class="card">
      <div class="label">${t.revenue}</div>
      <div class="value">${totalRevenue.toLocaleString()} DZD</div>
    </div>
    <div class="card">
      <div class="label">${t.profit}</div>
      <div class="value">${totalProfit.toLocaleString()} DZD</div>
    </div>
    <div class="card">
      <div class="label">${t.transactions}</div>
      <div class="value" style="color:#334155">${totalTx}</div>
    </div>
  </div>

  <div class="section-title">${t.financial}</div>
  <table>
    <thead><tr>
      <th>${t.month}</th>
      <th>${t.revenue}</th>
      <th>${t.expenses}</th>
      <th>${t.profit}</th>
    </tr></thead>
    <tbody>${finRows}</tbody>
  </table>

  <div class="section-title">${t.staffTitle}</div>
  <table class="staff-head">
    <thead><tr>
      <th>${t.staff}</th>
      <th>${t.revenue}</th>
      <th>${t.clients}</th>
      <th>${t.trans}</th>
    </tr></thead>
    <tbody>${staffRows}</tbody>
  </table>

  <div class="section-title">${t.inventory}</div>
  <table class="inv-head">
    <thead><tr>
      <th>${t.product}</th>
      <th>${t.stock}</th>
      <th>${t.minStock}</th>
      <th>${t.price}</th>
    </tr></thead>
    <tbody>${invRows}</tbody>
  </table>

  <div class="footer">
    ${storeName} · ${format(new Date(), 'yyyy-MM-dd')}
  </div>

  <script>
    // Wait for Arabic font to load, then print
    document.fonts.ready.then(() => window.print());
    window.onafterprint = () => window.close();
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Fallback: download HTML file
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapport_${format(new Date(), 'yyyy-MM-dd')}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

// ─── Legacy jsPDF generator (French/Latin only) ───────────────────────────────
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const generatePDFReport = (data: ReportData, _language: Language) => {
  const doc = new jsPDF();
  const locale = fr;
  const pageWidth = doc.internal.pageSize.width;

  const PRIMARY_COLOR = [16, 185, 129];
  const SECONDARY_COLOR = [244, 63, 94];
  const TEXT_COLOR = [51, 65, 85];

  const storeName = data.storeName || 'Caisse Xpress';
  const dateStr = data.dateRange?.from && data.dateRange?.to
    ? `${format(data.dateRange.from, 'dd MMM yyyy', { locale })} - ${format(data.dateRange.to, 'dd MMM yyyy', { locale })}`
    : format(new Date(), 'dd MMM yyyy', { locale });

  // Header
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${storeName} - Rapport Complet`, 14, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${dateStr}`, pageWidth - 14, 13, { align: 'right' });

  let y = 35;
  const totalRevenue = data.financial?.totalRevenue || 0;
  const totalProfit = data.financial?.totalProfit || 0;
  const totalTx = data.financial?.totalTransactions || 0;

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);

  [[14, 'Revenus', totalRevenue], [80, 'Profit (Est.)', totalProfit], [146, 'Transactions', totalTx]].forEach(([x, label, val]: any, i) => {
    const w = i === 2 ? 50 : 60;
    doc.roundedRect(x, y, w, 25, 3, 3, 'FD');
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text(String(label), x + 6, y + 8);
    doc.setFontSize(13); doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text(typeof val === 'number' ? `${val.toLocaleString()} DZD` : String(val), x + 6, y + 18);
  });
  y += 40;

  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Détails Financiers', 14, y); y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Mois', 'Revenus', 'Dépenses', 'Profit']],
    body: (data.financial?.monthlyRevenue || []).map((r: any) => [r.month, `${r.revenue.toLocaleString()} DZD`, `${r.expenses.toLocaleString()} DZD`, `${r.profit.toLocaleString()} DZD`]),
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR as any },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Performance du Personnel', 14, y); y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Staff', 'Revenus', 'Clients', 'Trans.']],
    body: (data.staff || []).map((r: any) => [r.name, `${r.revenue.toLocaleString()} DZD`, r.clients, r.transactions]),
    theme: 'grid',
    headStyles: { fillColor: SECONDARY_COLOR as any },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('État du Stock', 14, y); y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Produit', 'Stock', 'Min.', 'Prix']],
    body: (data.inventory || []).map((r: any) => [r.name, r.stock, r.minStock, `${r.price} DZD`]),
    theme: 'grid',
    headStyles: { fillColor: TEXT_COLOR as any },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`Rapport_Complet_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// ─── Main export: routes by language ─────────────────────────────────────────
export const generateFullReport = (data: ReportData, language: Language) => {
  if (language === 'ar') {
    // Arabic: use HTML/print approach with proper font support
    generateHTMLReport(data, language);
  } else {
    // French: use jsPDF as before
    generatePDFReport(data, language);
  }
};
