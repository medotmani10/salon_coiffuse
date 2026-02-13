import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export const generateFullReport = (data: ReportData, language: Language) => {
    const doc = new jsPDF();
    const isAr = language === 'ar';
    const locale = isAr ? ar : fr;
    const pageWidth = doc.internal.pageSize.width;

    // Colors
    const PRIMARY_COLOR = [16, 185, 129]; // Emerald 500
    const SECONDARY_COLOR = [244, 63, 94]; // Rose 500
    const TEXT_COLOR = [51, 65, 85]; // Slate 700

    // Helper for RTL text alignment
    const alignRight = (text: string, y: number, fontSize = 12) => {
        doc.setFontSize(fontSize);
        doc.text(text, pageWidth - 14, y, { align: 'right' });
    };

    const alignLeft = (text: string, y: number, fontSize = 12) => {
        doc.setFontSize(fontSize);
        doc.text(text, 14, y, { align: 'left' });
    };

    const printText = (text: string, y: number, fontSize = 12, isBold = false) => {
        doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
        if (isBold) doc.setFont('helvetica', 'bold');
        else doc.setFont('helvetica', 'normal');

        if (isAr) alignRight(text, y, fontSize);
        else alignLeft(text, y, fontSize);
    };

    // --- Header ---
    doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.rect(0, 0, pageWidth, 20, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const storeName = data.storeName || 'Caisse Xpress';
    const title = isAr ? `التقرير الشامل - ${storeName}` : `${storeName} - Rapport Complet`;
    if (isAr) doc.text(title, pageWidth - 14, 13, { align: 'right' });
    else doc.text(title, 14, 13);

    // Date Range
    const dateStr = data.dateRange?.from && data.dateRange?.to
        ? `${format(data.dateRange.from, 'dd MMM yyyy', { locale })} - ${format(data.dateRange.to, 'dd MMM yyyy', { locale })}`
        : format(new Date(), 'dd MMM yyyy', { locale });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateLabel = isAr ? `الفترة: ${dateStr}` : `Période: ${dateStr}`;
    if (isAr) doc.text(dateLabel, 14, 13, { align: 'left' }); // Date on left for RTL header
    else doc.text(dateLabel, pageWidth - 14, 13, { align: 'right' });

    let currentY = 35;

    // --- Executive Summary ---
    printText(isAr ? 'ملخص الأداء' : 'Résumé Exécutif', currentY, 14, true);
    currentY += 10;

    const totalRevenue = data.financial?.totalRevenue || 0;
    const totalProfit = data.financial?.totalProfit || 0;
    const totalTx = data.financial?.totalTransactions || 0;

    // Draw Summary Cards (Simple approximation with text)
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);

    // Card 1: Revenue
    doc.roundedRect(14, currentY, 60, 25, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(isAr ? 'الإيرادات' : 'Revenus', 20, currentY + 8);
    doc.setFontSize(14);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text(`${totalRevenue.toLocaleString()} DZD`, 20, currentY + 18);

    // Card 2: Profit
    doc.roundedRect(80, currentY, 60, 25, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(isAr ? 'الأرباح (تقديري)' : 'Profit (Est.)', 86, currentY + 8);
    doc.setFontSize(14);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text(`${totalProfit.toLocaleString()} DZD`, 86, currentY + 18);

    // Card 3: Transactions
    doc.roundedRect(146, currentY, 50, 25, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(isAr ? 'المعاملات' : 'Transactions', 152, currentY + 8);
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text(totalTx.toString(), 152, currentY + 18);

    currentY += 40;

    // --- Financial Details Table ---
    printText(isAr ? 'التفاصيل المالية' : 'Détails Financiers', currentY, 14, true);
    currentY += 5;

    const finHead = [
        isAr ? ['الأرباح', 'المصروفات', 'الإيرادات', 'الشهر'] : ['Mois', 'Revenus', 'Dépenses', 'Profit']
    ];
    const finBody = (data.financial?.monthlyRevenue || []).map((row: any) => {
        const r = [
            `${row.revenue.toLocaleString()} DZD`,
            `${row.expenses.toLocaleString()} DZD`,
            `${row.profit.toLocaleString()} DZD`
        ];
        return isAr ? [...r, row.month] : [row.month, ...r];
    });

    autoTable(doc, {
        startY: currentY,
        head: finHead,
        body: finBody,
        theme: 'grid',
        headStyles: { fillColor: PRIMARY_COLOR as any, halign: isAr ? 'right' : 'left' },
        styles: { halign: isAr ? 'right' : 'left', font: 'helvetica' },
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;

    // --- Staff Performance ---
    // Check if we need a new page
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    printText(isAr ? 'أداء الموظفين' : 'Performance du Personnel', currentY, 14, true);
    currentY += 5;

    const staffHead = [
        isAr ? ['المعاملات', 'العملاء', 'الإيرادات', 'الموظف'] : ['Staff', 'Revenus', 'Clients', 'Trans.']
    ];
    const staffBody = (data.staff || []).map((row: any) => {
        const r = [
            `${row.revenue.toLocaleString()} DZD`,
            row.clients,
            row.transactions
        ];
        return isAr ? [...r, row.name] : [row.name, ...r];
    });

    autoTable(doc, {
        startY: currentY,
        head: staffHead,
        body: staffBody,
        theme: 'grid',
        headStyles: { fillColor: SECONDARY_COLOR as any, halign: isAr ? 'right' : 'left' },
        styles: { halign: isAr ? 'right' : 'left' },
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;

    // --- Inventory ---
    if (currentY > 230) {
        doc.addPage();
        currentY = 20;
    }

    printText(isAr ? 'حالة المخزون' : 'État du Stock', currentY, 14, true);
    currentY += 5;

    const invHead = [
        isAr ? ['السعر', 'الحد الأدنى', 'المخزون', 'المنتج'] : ['Produit', 'Stock', 'Min.', 'Prix']
    ];
    const invBody = (data.inventory || []).map((row: any) => {
        const r = [
            row.stock,
            row.minStock,
            `${row.price} DZD`
        ];
        return isAr ? [...r, row.name] : [row.name, ...r];
    });

    autoTable(doc, {
        startY: currentY,
        head: invHead,
        body: invBody,
        theme: 'grid',
        headStyles: { fillColor: TEXT_COLOR as any, halign: isAr ? 'right' : 'left' },
        styles: { halign: isAr ? 'right' : 'left' },
        columnStyles: isAr ? { 3: { fontStyle: 'bold' } } : { 0: { fontStyle: 'bold' } }
    });

    // Footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `${isAr ? 'صفحة' : 'Page'} ${i} / ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    doc.save(`Rapport_Complet_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
