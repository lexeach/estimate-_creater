import { jsPDF } from 'jspdf';
import { money, dateText } from './api.js';
const businessName = import.meta.env.VITE_BUSINESS_NAME || 'Your Sales Business';
function writeWrapped(doc, text, x, y, width, lineHeight = 5) {
  const lines = doc.splitTextToSize(String(text || ''), width);
  doc.text(lines, x, y); return y + lines.length * lineHeight;
}
export function estimatePdf(estimate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFillColor(23, 60, 53); doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.text(businessName, 14, 16);
  doc.setFontSize(10); doc.text('ESTIMATE / QUOTATION', 14, 25);
  doc.setFontSize(10); doc.text(estimate.estimateNumber || 'Estimate', 196, 16, { align: 'right' });
  doc.setTextColor(35,45,43); let y = 47;
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Prepared for', 14, y); doc.setFont(undefined, 'normal'); y += 6;
  const c = estimate.clientSnapshot || {};
  y = writeWrapped(doc, c.businessName ? `${c.name} (${c.businessName})` : c.name, 14, y, 90);
  y = writeWrapped(doc, c.phone, 14, y, 90); y = writeWrapped(doc, c.billingAddress, 14, y, 90);
  doc.setFontSize(9); doc.text(`Date: ${dateText(estimate.createdAt)}`, 196, 48, { align: 'right' });
  if (estimate.validUntil) doc.text(`Valid until: ${dateText(estimate.validUntil)}`, 196, 54, { align: 'right' });
  y = Math.max(y + 8, 70);
  const columns = [14, 83, 111, 130, 153, 176];
  doc.setFillColor(235,241,238); doc.rect(14, y-5, 182, 9, 'F'); doc.setFont(undefined,'bold'); doc.setFontSize(8);
  ['Product / Company','Qty','Rate','Disc.','Tax','Amount'].forEach((t,i) => doc.text(t, columns[i], y, i ? { align:'right' } : {}));
  doc.setFont(undefined,'normal'); y += 8;
  for (const item of estimate.items || []) {
    if (y > 255) { doc.addPage(); y = 18; }
    y = writeWrapped(doc, `${item.productName}\n${item.companyName}`, columns[0], y, 65, 4);
    doc.text(String(item.quantity), columns[1], y-4, { align:'right' });
    doc.text(money(item.unitPrice), columns[2], y-4, { align:'right' });
    doc.text(`${item.discountPercent || 0}%`, columns[3], y-4, { align:'right' });
    doc.text(`${item.taxRate || 0}%`, columns[4], y-4, { align:'right' });
    doc.text(money(item.lineTotal), columns[5], y-4, { align:'right' });
    y += 3; doc.setDrawColor(225,230,227); doc.line(14,y,196,y); y += 5;
  }
  y = Math.max(y + 4, 90);
  if (y > 250) { doc.addPage(); y = 20; }
  const totals = [['Subtotal', estimate.subtotal], ['Discount', -estimate.discountTotal], ['Tax', estimate.taxTotal], ['Additional charges', estimate.additionalCharges], ['Grand total', estimate.grandTotal]];
  doc.setFontSize(10);
  for (const [label, value] of totals) { doc.setFont(undefined, label === 'Grand total' ? 'bold' : 'normal'); doc.text(label, 132, y); doc.text(money(value), 196, y, { align:'right' }); y += 7; }
  const bank = estimate.bankDetails || {};
  const bankLines = [
    ['Account holder', bank.bankAccountHolder], ['Bank', bank.bankName],
    ['Account number', bank.accountNumber], ['IFSC', bank.ifscCode],
    ['Branch', bank.branch], ['UPI ID', bank.upiId]
  ].filter(([, value]) => String(value || '').trim());
  if (bankLines.length || bank.paymentInstructions) {
    y += 5;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont(undefined,'bold'); doc.setFontSize(10); doc.text('PAYMENT DETAILS',14,y); y += 6;
    doc.setFont(undefined,'normal'); doc.setFontSize(9);
    for (const [label,value] of bankLines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont(undefined,'bold'); doc.text(`${label}:`,14,y); doc.setFont(undefined,'normal');
      const valueLines = doc.splitTextToSize(String(value),150);
      doc.text(valueLines,48,y); y += Math.max(5,valueLines.length*4.5);
    }
    if (bank.paymentInstructions) {
      y += 1; if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont(undefined,'bold'); doc.text('Payment instructions',14,y); doc.setFont(undefined,'normal');
      y = writeWrapped(doc,bank.paymentInstructions,14,y+5,180,4.5);
    }
  }
  if (estimate.notes) { y += 5; if (y > 270) { doc.addPage(); y = 20; } doc.setFont(undefined,'bold'); doc.text('Notes',14,y); doc.setFont(undefined,'normal'); y = writeWrapped(doc, estimate.notes,14,y+5,180); }
  if (estimate.terms) { y += 5; if (y > 270) { doc.addPage(); y = 20; } doc.setFont(undefined,'bold'); doc.text('Terms & conditions',14,y); doc.setFont(undefined,'normal'); y = writeWrapped(doc, estimate.terms,14,y+5,180); }
  if (y > 278) { doc.addPage(); y = 20; }
  doc.setFontSize(8); doc.setTextColor(100,110,106); doc.text('This estimate is not a tax invoice. Final terms are subject to confirmation.', 14, Math.min(285,Math.max(y+6,285)));
  doc.save(`${estimate.estimateNumber || 'estimate'}.pdf`);
}
export function companyOrderPdf(order, companyOrder) {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  doc.setFillColor(23,60,53); doc.rect(0,0,210,34,'F'); doc.setTextColor(255,255,255);
  doc.setFontSize(17); doc.text(businessName,14,15); doc.setFontSize(10); doc.text('COMPANY ORDER REQUEST',14,24);
  doc.text(companyOrder.companyOrderNumber || order.orderNumber,196,15,{align:'right'});
  doc.setTextColor(35,45,43); let y=44; doc.setFontSize(10);
  doc.setFont(undefined,'bold'); doc.text('To',14,y); doc.setFont(undefined,'normal'); y+=6;
  y=writeWrapped(doc,companyOrder.companyName,14,y,100); y=writeWrapped(doc,companyOrder.companySnapshot?.contactPerson,14,y,100); y=writeWrapped(doc,companyOrder.companySnapshot?.email,14,y,100); y=writeWrapped(doc,companyOrder.companySnapshot?.phone,14,y,100);
  y+=5; doc.setFont(undefined,'bold'); doc.text('Customer / delivery details',14,y); doc.setFont(undefined,'normal'); y+=6;
  y=writeWrapped(doc,order.clientSnapshot?.name,14,y,160); y=writeWrapped(doc,order.clientSnapshot?.businessName,14,y,160); y=writeWrapped(doc,order.clientSnapshot?.phone,14,y,160); y=writeWrapped(doc,order.clientSnapshot?.shippingAddress || order.clientSnapshot?.billingAddress,14,y,160); y+=8;
  doc.setFillColor(235,241,238); doc.rect(14,y-5,182,9,'F'); doc.setFont(undefined,'bold');
  doc.text('Product',14,y); doc.text('Qty',128,y,{align:'right'}); doc.text('Rate',158,y,{align:'right'}); doc.text('Amount',196,y,{align:'right'}); doc.setFont(undefined,'normal'); y+=8;
  for (const item of companyOrder.items || []) { y=writeWrapped(doc,item.productName,14,y,95); doc.text(String(item.quantity),128,y-4,{align:'right'}); doc.text(money(item.unitPrice),158,y-4,{align:'right'}); doc.text(money(item.lineTotal),196,y-4,{align:'right'}); y+=4; doc.line(14,y,196,y); y+=5; }
  y+=5; doc.setFont(undefined,'bold'); doc.text('Company order total',130,y); doc.text(money(companyOrder.total),196,y,{align:'right'}); y+=10;
  doc.setFont(undefined,'normal'); doc.setFontSize(9); writeWrapped(doc,`Master order: ${order.orderNumber}. Please confirm availability, expected dispatch date and applicable fulfilment terms.`,14,y,180);
  doc.save(`${companyOrder.companyOrderNumber || order.orderNumber}-company-order.pdf`);
}
