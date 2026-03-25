import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';

interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  filename: string;
  data: any[];
  columns: { header: string; key: string; width?: number }[];
}

export const useExport = () => {
  const exportData = async (options: ExportOptions) => {
    const { format, filename, data, columns } = options;

    if (format === 'csv') {
      let csv = columns.map(c => c.header).join(',') + '\n';
      data.forEach(row => {
        csv += columns.map(c => {
          const val = row[c.key];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
    } else if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ledger Data');
      
      worksheet.columns = columns.map(c => ({
        header: c.header.toUpperCase(),
        key: c.key,
        width: c.width || 20
      }));

      // Styling Headers
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' } // Emerald 500
      };

      data.forEach(row => {
        worksheet.addRow(row);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      a.click();
    } else if (format === 'pdf') {
       const doc = new jsPDF();
       doc.setFontSize(20);
       doc.setTextColor(16, 185, 129); // Emerald 500
       doc.text("LEDGER FINANCIAL REPORT", 10, 20);
       
       doc.setFontSize(10);
       doc.setTextColor(100);
       doc.text(`Generated on ${new Date().toLocaleString()}`, 10, 30);
       
       let y = 45;
       // Header
       doc.setFont("helvetica", "bold");
       columns.forEach((col, i) => {
         doc.text(col.header, 10 + (i * 40), y);
       });
       
       y += 10;
       doc.setFont("helvetica", "normal");
       data.forEach(row => {
         if (y > 280) { doc.addPage(); y = 20; }
         columns.forEach((col, i) => {
           doc.text(String(row[col.key]).slice(0, 20), 10 + (i * 40), y);
         });
         y += 7;
       });
       
       doc.save(`${filename}.pdf`);
    }
  };

  return { exportData };
};
