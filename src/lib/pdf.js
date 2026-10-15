import { jsPDF } from 'jspdf';
import { money, dateText } from './api.js';
const businessName = import.meta.env.VITE_BUSINESS_NAME || 'Your Sales Business';
// jsPDF's built-in Helvetica does not reliably render the Indian rupee glyph.
// Use a clear ASCII currency label in PDFs to prevent missing-glyph and spacing artifacts.
const pdfAmount = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pdfMoney = value => `INR ${pdfAmount(value)}`;
function writeWrapped(doc, text, x, y, width, lineHeight = 5) {
  const lines = doc.splitTextToSize(String(text || ''), width);
  doc.text(lines, x, y); return y + lines.length * lineHeight;
}
export function estimatePdf(estimate, { download = true } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const brand = estimate.bankDetails || {};
  const title = brand.businessName || businessName;
  // Branded masthead with optional uploaded logo and seller contact details.
  doc.setFillColor(23, 60, 53); doc.rect(0, 0, 210, 43, 'F');
  doc.setDrawColor(119, 190, 164); doc.setLineWidth(0.8); doc.line(14, 40, 196, 40);
  let textX = 14;
  if (brand.logoDataUrl) {
    try {
      const fmt = brand.logoDataUrl.startsWith('data:image/png') ? 'PNG' : brand.logoDataUrl.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
      doc.addImage(brand.logoDataUrl, fmt, 14, 7, 24, 24, undefined, 'FAST'); textX = 43;
    } catch (_) { textX = 14; }
  }
  doc.setTextColor(255,255,255); doc.setFontSize(17); doc.setFont(undefined,'bold'); doc.text(title, textX, 15, { maxWidth: 112 });
  doc.setFont(undefined,'normal'); doc.setFontSize(8.5);
  let contactY = 21;
  for (const line of [brand.businessAddress, brand.businessPhone, brand.businessEmail, brand.businessWebsite].filter(v => String(v || '').trim())) {
    const lines = doc.splitTextToSize(String(line), 115); doc.text(lines, textX, contactY); contactY += lines.length * 4;
  }
  doc.setFontSize(10); doc.setFont(undefined,'bold'); doc.text('ESTIMATE / QUOTATION', 196, 27, { align:'right' });
  doc.setFont(undefined,'normal'); doc.setFontSize(8.5); doc.text(estimate.estimateNumber || 'Estimate', 196, 33, { align:'right' });
  doc.setTextColor(35,45,43); let y = 52;
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('PREPARED FOR', 14, y); doc.setFont(undefined, 'normal'); y += 6;
  const c = estimate.clientSnapshot || {};
  y = writeWrapped(doc, c.businessName ? `${c.name} (${c.businessName})` : c.name, 14, y, 90);
  y = writeWrapped(doc, c.phone, 14, y, 90); y = writeWrapped(doc, c.email, 14, y, 90); y = writeWrapped(doc, c.billingAddress, 14, y, 90);
  doc.setFontSize(9); doc.text(`Date: ${dateText(estimate.createdAt)}`, 196, 52, { align: 'right' });
  if (estimate.validUntil) doc.text(`Valid until: ${dateText(estimate.validUntil)}`, 196, 58, { align: 'right' });
  y = Math.max(y + 8, 76);
  const x0=14, x1=83, x2=111, x3=130, x4=153, x5=176, x6=196;
  const cols = [x0,x1,x2,x3,x4,x5,x6];
  doc.setFillColor(23,60,53); doc.roundedRect(x0,y-5,182,9,1,1,'F'); doc.setTextColor(255,255,255); doc.setFont(undefined,'bold'); doc.setFontSize(8);
  ['Product / Company','Qty','Rate (INR)','Disc.','Tax','Amount (INR)'].forEach((t,i) => doc.text(t, [x0,x1,x2,x3,x4,x5][i], y, i ? { align:'right' } : {}));
  doc.setTextColor(35,45,43); doc.setFont(undefined,'normal'); y += 4;
  for (let idx=0; idx<(estimate.items||[]).length; idx++) {
    const item=estimate.items[idx];
    const productLines=doc.splitTextToSize(`${item.productName}\n${item.companyName}`,65);
    const rowH=Math.max(11, productLines.length*4+4);
    if (y+rowH>260) { doc.addPage(); y=20; }
    if (idx%2===0) { doc.setFillColor(246,249,247); doc.rect(x0,y-2,182,rowH,'F'); }
    doc.setDrawColor(211,222,216); doc.setLineWidth(0.25);
    doc.line(x0,y-2,x6,y-2); doc.line(x0,y+rowH-2,x6,y+rowH-2);
    for (const x of cols) doc.line(x,y-2,x,y+rowH-2);
    doc.setFontSize(8.5); doc.setFont(undefined,'bold'); doc.text(String(item.productName||''),x0+2,y+3);
    doc.setFont(undefined,'normal'); doc.setTextColor(105,119,112); doc.setFontSize(7.5); doc.text(String(item.companyName||''),x0+2,y+7);
    doc.setTextColor(35,45,43); doc.setFontSize(7.2);
    doc.text(String(item.quantity),x1-2,y+4,{align:'right'}); doc.text(pdfAmount(item.unitPrice),x2-2,y+4,{align:'right'}); doc.text(`${item.discountPercent||0}%`,x3-2,y+4,{align:'right'}); doc.text(`${item.taxRate||0}%`,x4-2,y+4,{align:'right'}); doc.setFont(undefined,'bold'); doc.text(pdfAmount(item.lineTotal),x6-2,y+4,{align:'right'}); doc.setFont(undefined,'normal');
    y += rowH;
  }
  y += 7; if (y > 240) { doc.addPage(); y = 20; }
  const totals = [['Subtotal', estimate.subtotal], ['Discount', -estimate.discountTotal], ['Tax', estimate.taxTotal], ['Additional charges', estimate.additionalCharges], ['GRAND TOTAL', estimate.grandTotal]];
  const totalBoxX=112,totalBoxW=84; doc.setFillColor(241,246,243); doc.roundedRect(totalBoxX,y-5,totalBoxW,totals.length*7+7,2,2,'F');
  doc.setFontSize(9);
  for (const [index, [label, value]] of totals.entries()) {
    const grand=label==='GRAND TOTAL';
    if (index > 0) {
      doc.setDrawColor(grand ? 23 : 211, grand ? 60 : 222, grand ? 53 : 216);
      doc.setLineWidth(grand ? 0.6 : 0.25);
      doc.line(totalBoxX+3, y-4, totalBoxX+totalBoxW-3, y-4);
    }
    if(grand){ doc.setTextColor(23,60,53); }
    doc.setFont(undefined, grand ? 'bold' : 'normal');
    doc.text(label, totalBoxX+5, y);
    doc.text(pdfMoney(value), totalBoxX+totalBoxW-4, y, { align:'right' });
    y += 7;
  }
  doc.setTextColor(35,45,43);
  const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');
  if (estimate.paymentToken) {
    y += 5; if (y > 255) { doc.addPage(); y = 20; }
    const payUrl = `${publicAppUrl}/pay/${estimate.paymentToken}`;
    doc.setFillColor(23,60,53); doc.roundedRect(14,y-5,182,13,2,2,'F');
    doc.setTextColor(255,255,255); doc.setFont(undefined,'bold'); doc.setFontSize(10);
    doc.text('PAY NOW  -  Secure online payment', 105, y+3, { align:'center' });
    doc.link(14,y-5,182,13,{url:payUrl});
    doc.setTextColor(35,45,43); doc.setFont(undefined,'normal'); doc.setFontSize(7.5);
    doc.text('Click this button in the PDF to pay online.',14,y+12); y += 15;
  }
  const bankLines = [['Account holder',brand.bankAccountHolder],['Bank',brand.bankName],['Account number',brand.accountNumber],['IFSC',brand.ifscCode],['Branch',brand.branch],['UPI ID',brand.upiId]].filter(([,v])=>String(v||'').trim());
  if (bankLines.length || brand.paymentInstructions) {
    y += 5; if (y > 245) { doc.addPage(); y = 20; }
    doc.setFillColor(23,60,53); doc.roundedRect(14,y-5,182,8,1,1,'F'); doc.setTextColor(255,255,255); doc.setFont(undefined,'bold'); doc.setFontSize(9); doc.text('PAYMENT DETAILS',18,y); y+=8;
    doc.setTextColor(35,45,43); doc.setFontSize(8.5);
    for (const [label,value] of bankLines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setDrawColor(220,228,223); doc.line(14,y+2,196,y+2); doc.setFont(undefined,'bold'); doc.text(`${label}:`,18,y); doc.setFont(undefined,'normal'); doc.text(String(value),60,y,{maxWidth:130}); y+=6;
    }
    if (brand.paymentInstructions) { y+=1; doc.setFont(undefined,'bold'); doc.text('Payment instructions:',18,y); doc.setFont(undefined,'normal'); y=writeWrapped(doc,brand.paymentInstructions,18,y+5,174,4.5); }
  }
  if (estimate.notes) { y+=5; if(y>270){doc.addPage();y=20;} doc.setFont(undefined,'bold');doc.text('Notes',14,y);doc.setFont(undefined,'normal');y=writeWrapped(doc,estimate.notes,14,y+5,180); }
  if (estimate.terms) { y+=5; if(y>270){doc.addPage();y=20;} doc.setFont(undefined,'bold');doc.text('Terms & conditions',14,y);doc.setFont(undefined,'normal');y=writeWrapped(doc,estimate.terms,14,y+5,180); }
  if(y>278){doc.addPage();y=20;}
  doc.setDrawColor(23,60,53);doc.setLineWidth(0.5);doc.line(14,282,196,282);doc.setFontSize(8);doc.setTextColor(100,110,106);doc.text('This estimate is not a tax invoice. Final terms are subject to confirmation.',14,287);
  const filename = `${estimate.estimateNumber || 'estimate'}.pdf`;
  const blob = doc.output('blob');
  if (download) doc.save(filename);
  return { blob, filename };
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
  doc.text('Product',14,y); doc.text('Qty',128,y,{align:'right'}); doc.text('Rate (INR)',158,y,{align:'right'}); doc.text('Amount (INR)',196,y,{align:'right'}); doc.setFont(undefined,'normal'); y+=8;
  for (const item of companyOrder.items || []) { y=writeWrapped(doc,item.productName,14,y,95); doc.text(String(item.quantity),128,y-4,{align:'right'}); doc.text(pdfAmount(item.unitPrice),158,y-4,{align:'right'}); doc.text(pdfAmount(item.lineTotal),196,y-4,{align:'right'}); y+=4; doc.line(14,y,196,y); y+=5; }
  y+=5; doc.setFont(undefined,'bold'); doc.text('Company order total',130,y); doc.text(pdfMoney(companyOrder.total),196,y,{align:'right'}); y+=10;
  // Payment summary belongs to the master order and is included on every supplier order receipt for visibility.
  const orderTotal = Number(order.grandTotal || 0);
  const paidTotal = Number(order.paidTotal || 0);
  const balanceDue = Math.max(0, Number(order.balanceDue ?? (orderTotal - paidTotal)));
  const paymentStatus = order.paymentStatus || (balanceDue <= 0 ? 'Paid' : paidTotal > 0 ? 'Partially Paid' : 'Pending');
  if (y > 235) { doc.addPage(); y = 20; }
  doc.setFillColor(241,246,243); doc.roundedRect(112,y-5,84,31,2,2,'F');
  doc.setFontSize(8.5); doc.setTextColor(35,45,43); doc.setFont(undefined,'normal');
  doc.text('Master order total',116,y); doc.text(pdfMoney(orderTotal),192,y,{align:'right'}); y+=7;
  doc.text('Paid / received',116,y); doc.setTextColor(23,120,83); doc.text(pdfMoney(paidTotal),192,y,{align:'right'}); y+=7;
  doc.setTextColor(35,45,43); doc.text('Balance due',116,y); doc.setTextColor(balanceDue>0?180:23,balanceDue>0?100:120,balanceDue>0?20:83); doc.text(pdfMoney(balanceDue),192,y,{align:'right'}); y+=7;
  doc.setTextColor(35,45,43); doc.setFont(undefined,'bold'); doc.text(`Payment status: ${paymentStatus}`,14,y); y+=7;
  const payments = Array.isArray(order.payments) ? order.payments : [];
  if (payments.length) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont(undefined,'bold'); doc.text('Payment history',14,y); y+=5; doc.setFont(undefined,'normal'); doc.setFontSize(8);
    for (const payment of payments) {
      if (y > 275) { doc.addPage(); y = 20; }
      const paymentLine = `${dateText(payment.paymentDate)} | ${payment.paymentMode || 'Payment'} | ${payment.reference || 'No reference'} | ${pdfMoney(payment.amount)}`;
      y = writeWrapped(doc,paymentLine,14,y,180,4.5);
    }
    doc.setFontSize(9);
  }
  y+=3; if (y > 275) { doc.addPage(); y = 20; }
  doc.setFont(undefined,'normal'); doc.setFontSize(9); writeWrapped(doc,`Master order: ${order.orderNumber}. Please confirm availability, expected dispatch date and applicable fulfilment terms.`,14,y,180);
  doc.save(`${companyOrder.companyOrderNumber || order.orderNumber}-company-order.pdf`);
}
