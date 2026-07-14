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
  const plans = await PricingPlan.find({ active: true }).sort({ sortOrder: 1, price: 1 }).lean();
  return plans.map((p) => ({
    id: p._id,
    name: p.name,
    code: p.code,
    price: p.price,
    originalPrice: p.originalPrice || null,
    currency: p.currency || 'INR',
    durationDays: p.durationDays,
    maxDevices: p.maxDevices,
    oneTime: p.oneTime,
    planType: p.planType || 'standard',
    requiresStudentId: Boolean(p.requiresStudentId || p.planType === 'student'),
    seats: p.seats || p.maxDevices || 1,
    description: p.description || '',
    features: p.features || [],
  }));
}

/**
 * Purchase flow:
 * 1) Validate plan + customer (+ student ID / batch for special plans)
 * 2) Create order (paid immediately in demo mode)
 * 3) Generate license key bound to plan
 * 4) Return key to show on website
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

  const planType = plan.planType || 'standard';
  const needsStudent = Boolean(plan.requiresStudentId || planType === 'student');
  const studentId = String(body.studentId || '').trim();
  const collegeName = String(body.collegeName || '').trim();
  const batchName = String(body.batchName || '').trim();

  if (needsStudent) {
    if (!studentId || studentId.length < 4) {
      throw ApiError.badRequest('Valid college / student ID is required for Student plan');
    }
    if (!collegeName || collegeName.length < 2) {
      throw ApiError.badRequest('College / institute name is required for Student plan');
    }
  }

  if (planType === 'team' && !batchName) {
    // optional but recommended — auto-fill from name if empty
  }

  const orderId = makeOrderId();
  const paymentMethod = body.paymentMethod || 'demo';
  const seats = plan.seats || plan.maxDevices || 1;

  const noteParts = [
    `Order ${orderId}`,
    email,
    name,
    planType !== 'standard' ? `type:${planType}` : null,
    studentId ? `studentId:${studentId}` : null,
    collegeName ? `college:${collegeName}` : null,
    batchName || planType === 'team' ? `batch:${batchName || name}` : null,
  ].filter(Boolean);

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
    studentId: studentId || null,
    collegeName: collegeName || null,
    batchName: batchName || (planType === 'team' ? name : null),
    seats: planType === 'team' ? seats : null,
    meta: {
      userAgent: body.userAgent || null,
      source: body.source || 'next-app',
      planType,
      studentId: studentId || null,
      collegeName: collegeName || null,
      batchName: batchName || null,
    },
  });

  // Demo checkout: mark paid instantly and issue key
  const keys = await keyService.generateKeys({
    planId: plan._id,
    count: 1,
    note: noteParts.join(' · '),
    maxDevices: plan.maxDevices,
    oneTime: plan.oneTime,
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
      planType,
      seats,
    },
    customer: {
      name,
      email,
      studentId: studentId || null,
      collegeName: collegeName || null,
      batchName: order.batchName,
    },
    licenseKey: keyDoc.key,
    expiresAt: keyDoc.expiresAt,
    maxDevices: keyDoc.maxDevices,
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
    studentId: order.studentId,
    collegeName: order.collegeName,
    batchName: order.batchName,
    seats: order.seats,
    licenseKey: order.status === 'paid' ? order.licenseKey : null,
    createdAt: order.createdAt,
  };
}

async function listOrders(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    const re = new RegExp(String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { orderId: re },
      { customerEmail: re },
      { customerName: re },
      { studentId: re },
      { collegeName: re },
      { batchName: re },
      { licenseKey: re },
    ];
  }
  return Order.find(filter).sort({ createdAt: -1 }).limit(200).lean();
}

module.exports = {
  listPublicPlans,
  purchaseKey,
  getOrder,
  listOrders,
};
