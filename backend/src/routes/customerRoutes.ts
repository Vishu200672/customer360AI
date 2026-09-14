import { Router } from 'express';
import { CustomerService } from '../services/customerService.js';

const router = Router();
const service = new CustomerService();

// GET /api/v1/customers
router.get('/', async (req, res) => {
  try {
    const query = req.query.search as string;
    const statusFilter = req.query.status as string;
    const items = await service.listCustomers(query, statusFilter);
    res.json({
      success: true,
      data: items,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/customers/:id/360
router.get('/:id/360', async (req, res) => {
  try {
    const c360 = await service.getCustomer360(req.params.id);
    res.json({
      success: true,
      data: c360,
    });
  } catch (err: any) {
    res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: err.message } });
  }
});

// GET /api/v1/customers/:id/decision (PDF Page 25-26, 29-30)
router.get('/:id/decision', async (req, res) => {
  try {
    const decision = await service.getCustomerDecision(req.params.id);
    res.json({
      success: true,
      data: decision,
    });
  } catch (err: any) {
    res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: err.message } });
  }
});

// POST /api/v1/customers (Create new live customer entry)
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email } = req.body;
    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'first_name, last_name, and email are required.' },
      });
    }

    const created = await service.createCustomer(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Live customer entry created successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PUT /api/v1/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await service.updateCustomer(req.params.id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Customer entry updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /api/v1/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    await service.deleteCustomer(req.params.id);
    res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Customer entry deleted successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const customer = await service.getCustomer(req.params.id);
    res.json({
      success: true,
      data: customer,
    });
  } catch (err: any) {
    res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: err.message } });
  }
});

export default router;

