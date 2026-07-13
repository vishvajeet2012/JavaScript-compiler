const crypto = require('crypto');
const PricingPlan = require('../models/PricingPlan');
const Order = require('../models/Order');
const keyService = require('./key.service');
const ApiError = require('../utils/ApiError');

function makeOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${ts}-${rnd}`;
}

/**
 * Public active plans for storefront
 */
async function listPublicPlans() {
  await keyService.seedDefaultPlans();
  const plans = await PricingPlan.find({ active: true }).sort({ price: 1 }).lean();
  return plans.map((p) => ({
    id: p._id,
    name: p.name,
    code: p.code,
    price: p.price,
    currency: p.currency || 'INR',
    durationDays: p.durationDays,
    maxDevices: p.maxDevices,
    oneTime: p.oneTime,
    description: p.description || '',
    features: p.features || [],
  }));
}

/**
 * Purchase flow:
 * 1) Validate plan + customer
 * 2) Create order (paid immediately in demo mode)
 * 3) Generate license key bound to plan
 * 4) Return key to show on website (user activates in Electron app)
 */
async function purchaseKey(body = {}) {
  const planId = body.planId;
  const name = String(body.name || '').trim();
  const email = String(body.email || '')
    .trim()
    .toLowerCase();

  if (!planId) throw ApiError.badRequest('planId is required');
  if (!name || name.length < 2) throw ApiError.badRequest('name is required');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw ApiError.badRequest('valid email is required');
  }

  const plan = await PricingPlan.findById(planId);
  if (!plan || !plan.active) throw ApiError.notFound('Plan not found or inactive');

  const orderId = makeOrderId();
  const paymentMethod = body.paymentMethod || 'demo';

  const order = await Order.create({
    orderId,
    plan: plan._id,
    planCode: plan.code,
    planName: plan.name,
    price: plan.price,
    currency: plan.currency || 'INR',
    customerName: name,
    customerEmail: email,
    status: 'pending',
    paymentMethod,
    meta: {
      userAgent: body.userAgent || null,
      source: body.source || 'next-app',
    },
  });

  // Demo checkout: mark paid instantly and issue key
  // (Razorpay can plug in later before this step)
  const keys = await keyService.generateKeys({
    planId: plan._id,
    count: 1,
    note: `Order ${orderId} · ${email} · ${name}`,
  });

  const keyDoc = keys[0];
  order.status = 'paid';
  order.paymentRef = `DEMO-${Date.now()}`;
  order.licenseKey = keyDoc.key;
  order.licenseKeyId = keyDoc._id;
  await order.save();

  return {
    orderId: order.orderId,
    status: order.status,
    plan: {
      name: plan.name,
      code: plan.code,
      price: plan.price,
      currency: plan.currency,
      durationDays: plan.durationDays,
      maxDevices: plan.maxDevices,
      oneTime: plan.oneTime,
    },
    customer: { name, email },
    licenseKey: keyDoc.key,
    expiresAt: keyDoc.expiresAt,
    message:
      'Payment successful (demo). Copy your license key and activate it in the JS Compiler desktop app.',
  };
}

async function getOrder(orderId) {
  const order = await Order.findOne({ orderId }).lean();
  if (!order) throw ApiError.notFound('Order not found');
  return {
    orderId: order.orderId,
    status: order.status,
    planName: order.planName,
    price: order.price,
    currency: order.currency,
    customerEmail: order.customerEmail,
    licenseKey: order.status === 'paid' ? order.licenseKey : null,
    createdAt: order.createdAt,
  };
}

module.exports = {
  listPublicPlans,
  purchaseKey,
  getOrder,
};
