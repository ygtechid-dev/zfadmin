import { formatDateRangeDisplay } from '../components/common/DateFilterModal';

export interface ExportColumn {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    format?: 'currency' | 'number' | 'text';
}

export interface ExportSummaryItem {
    label: string;
    value: number | string;
    format?: 'currency' | 'number' | 'text';
}

export interface ExportReportOptions {
    title: string;
    branchName: string;
    startDate: Date;
    endDate: Date;
    columns: ExportColumn[];
    data: Record<string, any>[];
    summaryItems: ExportSummaryItem[];
    filename: string;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);

const formatValue = (value: any, format?: string) => {
    if (format === 'currency') return formatCurrency(Number(value));
    if (format === 'number') return String(value);
    return String(value ?? '');
};

export const exportToCSV = (options: ExportReportOptions) => {
    const { title, branchName, startDate, endDate, columns, data, summaryItems, filename } = options;

    let csv = `${title} - ${branchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
    csv += columns.map(c => c.label).join(',') + '\n';
    data.forEach(row => {
        csv += columns.map(c => {
            const val = formatValue(row[c.key], c.format);
            return c.format === 'text' || (!c.format && typeof row[c.key] === 'string')
                ? `"${val}"`
                : val;
        }).join(',') + '\n';
    });
    csv += `\nSummary\n`;
    summaryItems.forEach(s => {
        csv += `${s.label},${formatValue(s.value, s.format)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
};

export const exportToExcel = (options: ExportReportOptions) => {
    const { title, branchName, startDate, endDate, columns, data, summaryItems, filename } = options;

    let html = `<html><head><meta charset="UTF-8"></head><body>`;
    html += `<h2>${title} - ${branchName}</h2>`;
    html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
    html += `<h3>Summary</h3><table border="1">`;
    summaryItems.forEach(s => {
        const align = s.format === 'currency' ? 'right' : 'center';
        html += `<tr><td><strong>${s.label}</strong></td><td style="text-align:${align}">${formatValue(s.value, s.format)}</td></tr>`;
    });
    html += `</table><br/><h3>Detail</h3><table border="1"><tr>`;
    columns.forEach(c => { html += `<th>${c.label}</th>`; });
    html += `</tr>`;
    data.forEach(row => {
        html += `<tr>`;
        columns.forEach(c => {
            const align = c.align ?? (c.format === 'currency' ? 'right' : c.format === 'number' ? 'center' : 'left');
            html += `<td style="text-align:${align}">${formatValue(row[c.key], c.format)}</td>`;
        });
        html += `</tr>`;
    });
    // Total row
    html += `<tr style="font-weight:bold;background:#f5f5f5">`;
    columns.forEach((c, i) => {
        if (i === 0) { html += `<td>TOTAL</td>`; return; }
        const sumItem = summaryItems.find(s => s.label.toLowerCase().includes(c.label.toLowerCase()));
        const align = c.align ?? (c.format === 'currency' ? 'right' : 'center');
        html += `<td style="text-align:${align}">${sumItem ? formatValue(sumItem.value, sumItem.format) : ''}</td>`;
    });
    html += `</tr></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xls`;
    link.click();
};

export const exportToPDF = (options: ExportReportOptions) => {
    const { title, branchName, startDate, endDate, columns, data, summaryItems, filename } = options;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
        body{font-family:sans-serif;padding:20px;font-size:12px}
        h3{margin:16px 0 8px}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px}
        th,td{border:1px solid #ddd;padding:5px 7px}
        th{background:#f5f5f5;text-align:center;font-weight:600}
        .right{text-align:right} .center{text-align:center} .left{text-align:left}
        .total-row{font-weight:bold;background:#f5f5f5}
        .summary-table td:first-child{font-weight:600;width:220px}
        .summary-table td:last-child{text-align:right}
    </style></head><body>
    <h2>${title} - ${branchName}</h2>
    <p style="margin:2px 0">Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
    <h3>Summary</h3>
    <table class="summary-table" style="width:320px">`;
    summaryItems.forEach(s => {
        html += `<tr><td>${s.label}</td><td>${formatValue(s.value, s.format)}</td></tr>`;
    });
    html += `</table><h3>Detail</h3><table><thead><tr>`;
    columns.forEach(c => { html += `<th>${c.label}</th>`; });
    html += `</tr></thead><tbody>`;
    data.forEach(row => {
        html += `<tr>`;
        columns.forEach(c => {
            const align = c.align ?? (c.format === 'currency' ? 'right' : c.format === 'number' ? 'center' : 'left');
            html += `<td class="${align}">${formatValue(row[c.key], c.format)}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody><tfoot><tr class="total-row">`;
    columns.forEach((c, i) => {
        if (i === 0) { html += `<td>TOTAL</td>`; return; }
        const sumItem = summaryItems.find(s => s.label.toLowerCase().includes(c.label.toLowerCase()));
        const align = c.align ?? (c.format === 'currency' ? 'right' : 'center');
        html += `<td class="${align}">${sumItem ? formatValue(sumItem.value, sumItem.format) : ''}</td>`;
    });
    html += `</tr></tfoot></table>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
};