import PDFDocument from 'pdfkit';

export function isOfferActive(scheme, now = new Date()) {
  if (!scheme?.validUntil) return true;
  const expiry = new Date(`${scheme.validUntil}T23:59:59`);
  return !Number.isNaN(expiry.getTime()) && expiry >= now;
}

export function enrichProduct(product, data) {
  const company = data.companies.find((item) => item.id === product.companyId || String(item._id) === String(product.companyId));
  const distributor = data.distributors.find((item) => item.id === product.distributorId || String(item._id) === String(product.distributorId));
  return {
    ...product,
    companyName: company?.name || 'Unknown company',
    distributorName: distributor?.name || 'Unknown distributor',
    distributorRegion: distributor?.region || '',
    distributorAddress: distributor?.address || '',
    distributorAreas: distributor?.serviceAreas || []
  };
}

export function groupCartByDistributor(items, products, data = {}, appliedSchemeIds = []) {
  const groups = {};
  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId || String(entry._id) === String(item.productId));
    if (!product) continue;
    const key = product.distributorId;
    const distributor = data.distributors?.find((entry) => String(entry.id || entry._id) === String(key));
    groups[key] ||= { distributorId: key, distributorName: distributor?.name || 'Wholesaler', area: distributor?.region || distributor?.address || '', items: [], subtotal: 0, discount: 0, appliedOffer: null, offers: [] };
    const lineTotal = Number(product.ptr) * Number(item.quantity);
    groups[key].items.push({ ...item, product, lineTotal });
    groups[key].subtotal += lineTotal;
  }
  for (const group of Object.values(groups)) {
    const offers = (data.schemes || []).filter((scheme) => String(scheme.distributorId) === String(group.distributorId) && isOfferActive(scheme));
    group.offers = offers.filter((scheme) => group.subtotal >= Number(scheme.minOrderAmount || 0));
    const appliedOffer = offers.find((scheme) => appliedSchemeIds.includes(String(scheme.id || scheme._id)));
    if (appliedOffer && group.subtotal >= Number(appliedOffer.minOrderAmount || 0)) {
      group.appliedOffer = appliedOffer;
      group.discount = Number(appliedOffer.discountAmount || 0);
    }
    group.payable = Math.max(0, group.subtotal - group.discount);
  }
  return Object.values(groups);
}

export function makePurchaseOrderPdf(order, products, res) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=meditrade-po-${order.id || order._id}.pdf`);
  doc.pipe(res);
  doc.fontSize(20).text('MediTrade Hub Purchase Order');
  doc.moveDown();
  doc.fontSize(11).text(`Order: ${order.id || order._id}`);
  doc.text(`Status: ${order.status}`);
  doc.text(`Total: Rs. ${Number(order.total || 0).toFixed(2)}`);
  doc.moveDown();
  order.items.forEach((item, index) => {
    const product = products.find((entry) => entry.id === item.productId || String(entry._id) === String(item.productId));
    doc.text(`${index + 1}. ${product?.name || item.productId} | Qty: ${item.quantity} | PTR: Rs. ${item.price}`);
  });
  doc.end();
}
