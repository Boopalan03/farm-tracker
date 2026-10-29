/**
 * Pure Node.js PDF generator for automated server-side monthly reports
 * Produces standard valid PDF-1.4 documents without requiring binary dependencies.
 */
function generateServerReportPDF({ farmName, monthName, year, totalRevenue, totalExpenses, netProfit, inventory = [], sales = [], expenses = [] }) {
  const lines = [
    `%PDF-1.4`,
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj`,
    `4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj`,
    `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`
  ];

  // Helper to escape text for PDF literal strings
  const esc = (text) => String(text || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  // Stream content instructions
  const streamCommands = [];

  // Header background banner (Green #10b981 -> [0.063, 0.725, 0.506])
  streamCommands.push(`0.063 0.725 0.506 rg 0 762 595 80 re f`);
  
  // Title & Subtitle in White
  streamCommands.push(`1 1 1 rg`);
  streamCommands.push(`BT /F1 22 Tf 40 802 Td (${esc(farmName || 'FarmTracker')} - Monthly Report) Tj ET`);
  streamCommands.push(`BT /F2 12 Tf 40 782 Td (Automated Monthly Report for ${esc(monthName)} ${esc(year)} | Sent from noreply@farmtracker.com) Tj ET`);

  // Section 1: Financial Summary Box (Gray background)
  streamCommands.push(`0.95 0.96 0.98 rg 40 670 515 75 re f`);
  streamCommands.push(`0.85 0.88 0.92 RG 1 w 40 670 515 75 re S`);

  // Financial Summary Text
  streamCommands.push(`0.1 0.15 0.2 rg`);
  streamCommands.push(`BT /F1 14 Tf 55 725 Td (Financial Performance Overview) Tj ET`);
  
  streamCommands.push(`BT /F2 11 Tf 55 700 Td (Total Sales Revenue:  Rs ${Number(totalRevenue || 0).toFixed(2)}) Tj ET`);
  streamCommands.push(`BT /F2 11 Tf 220 700 Td (Total Expenses:  Rs ${Number(totalExpenses || 0).toFixed(2)}) Tj ET`);
  
  const isProfitable = Number(netProfit) >= 0;
  if (isProfitable) {
    streamCommands.push(`0.05 0.6 0.35 rg`);
  } else {
    streamCommands.push(`0.85 0.15 0.15 rg`);
  }
  streamCommands.push(`BT /F1 12 Tf 400 700 Td (Net Profit: Rs ${Number(netProfit || 0).toFixed(2)}) Tj ET`);

  // Section 2: Current Inventory
  streamCommands.push(`0.1 0.15 0.2 rg`);
  streamCommands.push(`BT /F1 13 Tf 40 645 Td (Livestock Inventory Summary) Tj ET`);
  
  let y = 625;
  streamCommands.push(`0.9 0.92 0.95 rg 40 ${y} 515 18 re f`);
  streamCommands.push(`BT /F1 10 Tf 50 ${y + 5} Td (Item / Type) Tj 250 0 Td (Head Count) Tj ET`);
  y -= 18;

  if (inventory.length === 0) {
    streamCommands.push(`BT /F2 10 Tf 50 ${y + 5} Td (No livestock inventory recorded.) Tj ET`);
    y -= 18;
  } else {
    inventory.slice(0, 6).forEach((item) => {
      streamCommands.push(`BT /F2 10 Tf 50 ${y + 5} Td (${esc(item.livestockType || '-')}) Tj 250 0 Td (${esc(item.totalCount || 0)}) Tj ET`);
      y -= 16;
    });
  }

  // Section 3: Recent Month Sales
  y -= 10;
  streamCommands.push(`0.1 0.15 0.2 rg`);
  streamCommands.push(`BT /F1 13 Tf 40 ${y} Td (Recent Month Sales Highlights) Tj ET`);
  y -= 20;

  streamCommands.push(`0.9 0.92 0.95 rg 40 ${y} 515 18 re f`);
  streamCommands.push(`BT /F1 10 Tf 50 ${y + 5} Td (Date) Tj 120 0 Td (Category) Tj 150 0 Td (Quantity) Tj 120 0 Td (Amount) Tj ET`);
  y -= 18;

  if (sales.length === 0) {
    streamCommands.push(`BT /F2 10 Tf 50 ${y + 5} Td (No sales logged for this period.) Tj ET`);
    y -= 18;
  } else {
    sales.slice(0, 5).forEach((s) => {
      const dateStr = s.date ? new Date(s.date).toLocaleDateString() : '-';
      streamCommands.push(`BT /F2 10 Tf 50 ${y + 5} Td (${esc(dateStr)}) Tj 120 0 Td (${esc(s.livestockType || '-')}) Tj 150 0 Td (${esc(s.quantitySold || '0')}) Tj 120 0 Td (Rs ${Number(s.amountReceived || 0).toFixed(2)}) Tj ET`);
      y -= 16;
    });
  }

  // Section 4: Recent Month Expenses
  y -= 10;
  streamCommands.push(`0.1 0.15 0.2 rg`);
  streamCommands.push(`BT /F1 13 Tf 40 ${y} Td (Recent Month Expenses Highlights) Tj ET`);
  y -= 20;

  streamCommands.push(`0.9 0.92 0.95 rg 40 ${y} 515 18 re f`);
  streamCommands.push(`BT /F1 10 Tf 50 ${y + 5} Td (Date) Tj 120 0 Td (Category) Tj 150 0 Td (Expense Type) Tj 120 0 Td (Amount) Tj ET`);
  y -= 18;

  if (expenses.length === 0) {
    streamCommands.push(`BT /F2 10 Tf 50 ${y + 5} Td (No expenses logged for this period.) Tj ET`);
    y -= 18;
  } else {
    expenses.slice(0, 5).forEach((e) => {
      const dateStr = e.date ? new Date(e.date).toLocaleDateString() : '-';
      streamCommands.push(`BT /F2 10 Tf 50 ${y + 5} Td (${esc(dateStr)}) Tj 120 0 Td (${esc(e.livestockType || '-')}) Tj 150 0 Td (${esc(e.category || '-')}) Tj 120 0 Td (Rs ${Number(e.amount || 0).toFixed(2)}) Tj ET`);
      y -= 16;
    });
  }

  // Footer
  streamCommands.push(`0.5 0.55 0.6 rg`);
  streamCommands.push(`BT /F2 9 Tf 40 30 Td (Generated automatically on the 1st of the month at 8:00 AM by FarmTracker. No-reply email: noreply@farmtracker.com) Tj ET`);

  const streamData = streamCommands.join('\n');
  lines.push(`6 0 obj << /Length ${Buffer.byteLength(streamData)} >> stream\n${streamData}\nendstream endobj`);

  // Build xref table
  let pdfText = lines.join('\n') + '\n';
  const offsets = [];
  let currentOffset = 0;
  
  // Calculate object byte offsets
  for (let i = 1; i <= 6; i++) {
    const objMarker = `${i} 0 obj`;
    offsets.push(pdfText.indexOf(objMarker));
  }

  const startXref = Buffer.byteLength(pdfText);
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    xref += String(off).padStart(10, '0') + ` 00000 n \n`;
  });

  const trailer = `trailer << /Size 7 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return Buffer.from(pdfText + xref + trailer);
}

module.exports = {
  generateServerReportPDF
};
