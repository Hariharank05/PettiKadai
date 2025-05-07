import { format } from 'date-fns';

interface ReportData {
  reportType: 'SALES' | 'INVENTORY' | 'PRODUCT_PERFORMANCE';
  data: any[];
  fileName: string;
  currencySymbol?: string;
}

// Generate CSV content for the report
export function generateCSVReport({ reportType, data, fileName, currencySymbol = '₹' }: ReportData): string {
  let csvContent = '';
  
  if (reportType === 'SALES') {
    csvContent = 'Date,Subtotal\n';
    csvContent += data
      .map((item) => `${item.date},${currencySymbol}${item.subtotal.toFixed(2)}`)
      .join('\n');
  } else if (reportType === 'INVENTORY') {
    csvContent = 'Product ID,Name,Quantity\n';
    csvContent += data
      .map((item) => `${item.productId},${item.name},${item.quantity}`)
      .join('\n');
  } else if (reportType === 'PRODUCT_PERFORMANCE') {
    csvContent = 'Product ID,Period,Revenue,Margin (%)\n';
    csvContent += data
      .map((item) => `${item.productId},${item.period},${currencySymbol}${item.revenue.toFixed(2)},${item.margin.toFixed(2)}`)
      .join('\n');
  }

  return csvContent;
}

// Generate LaTeX content for PDF report
export function generatePDFReport({ reportType, data, fileName, currencySymbol = '₹' }: ReportData): string {
  const currentDate = format(new Date(), 'yyyy-MM-dd');
  let tableContent = '';

  if (reportType === 'SALES') {
    tableContent = `
      \\begin{tabular}{|l|r|}
        \\hline
        \\textbf{Date} & \\textbf{Subtotal (${currencySymbol})} \\\\
        \\hline
        ${data
          .map(
            (item) => `${item.date} & ${item.subtotal.toFixed(2)} \\\\`
          )
          .join('\n        \\hline\n        ')}
        \\hline
      \\end{tabular}
    `;
  } else if (reportType === 'INVENTORY') {
    tableContent = `
      \\begin{tabular}{|l|l|r|}
        \\hline
        \\textbf{Product ID} & \\textbf{Name} & \\textbf{Quantity} \\\\
        \\hline
        ${data
          .map(
            (item) => `${item.productId} & ${item.name} & ${item.quantity} \\\\`
          )
          .join('\n        \\hline\n        ')}
        \\hline
      \\end{tabular}
    `;
  } else if (reportType === 'PRODUCT_PERFORMANCE') {
    tableContent = `
      \\begin{tabular}{|l|l|r|r|}
        \\hline
        \\textbf{Product ID} & \\textbf{Period} & \\textbf{Revenue (${currencySymbol})} & \\textbf{Margin (%)} \\\\
        \\hline
        ${data
          .map(
            (item) =>
              `${item.productId} & ${item.period} & ${item.revenue.toFixed(2)} & ${item.margin.toFixed(2)} \\\\`
          )
          .join('\n        \\hline\n        ')}
        \\hline
      \\end{tabular}
    `;
  }

  return `
\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{booktabs}
\\usepackage{noto}

\\title{${reportType} Report}
\\author{}
\\date{${currentDate}}

\\begin{document}

\\maketitle

\\section*{${reportType} Report}
Generated on ${currentDate} for ${fileName}.

\\vspace{1cm}

${tableContent}

\\end{document}
  `;
}