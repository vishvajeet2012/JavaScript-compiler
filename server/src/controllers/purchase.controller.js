const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const purchaseService = require('../services/purchase.service');

const listPlans = asyncHandler(async (req, res) => {
  const data = await purchaseService.listPublicPlans();
  return ApiResponse.ok(data, 'Plans retrieved').send(res);
});

const purchase = asyncHandler(async (req, res) => {
  const data = await purchaseService.purchaseKey({
    ...(req.body || {}),
    userAgent: req.get('user-agent'),
    source: 'next-app',
  });
  return ApiResponse.created(data, 'Purchase completed').send(res);
});

const getOrder = asyncHandler(async (req, res) => {
  const data = await purchaseService.getOrder(req.params.orderId);
  return ApiResponse.ok(data).send(res);
});

module.exports = { listPlans, purchase, getOrder };
