import { Router } from 'express';
import { IngestionService } from '../services/ingestionService.js';

const router = Router();
const service = new IngestionService();

// Sample dataset provided for 1-click user testing
const SAMPLE_ENTERPRISE_DATASET = [
  {
    external_customer_id: 'CUST-2048',
    first_name: 'Priya',
    last_name: 'Mehta',
    email: 'priya.mehta@enterprise.io',
    phone: '+91 98200 44321',
    age: 34,
    gender: 'Female',
    acquisition_channel: 'Paid Search',
    customer_status: 'At-Risk',
    recency_days: 44,
    frequency_count: 12,
    monetary_value: 48500,
    cart_abandonment_count: 4,
  },
  {
    external_customer_id: 'CUST-2049',
    first_name: 'Vikram',
    last_name: 'Malhotra',
    email: 'vikram.m@techcorp.com',
    phone: '+91 98111 88776',
    age: 41,
    gender: 'Male',
    acquisition_channel: 'Direct Organic',
    customer_status: 'VIP / Active',
    recency_days: 4,
    frequency_count: 28,
    monetary_value: 125000,
    cart_abandonment_count: 0,
  },
  {
    external_customer_id: 'CUST-2050',
    first_name: 'Ananya',
    last_name: 'Deshmukh',
    email: 'ananya.d@globalnet.org',
    phone: '+91 97654 32109',
    age: 28,
    gender: 'Female',
    acquisition_channel: 'Social Campaign',
    customer_status: 'Dormant',
    recency_days: 62,
    frequency_count: 3,
    monetary_value: 14000,
    cart_abandonment_count: 2,
  },
  {
    external_customer_id: 'CUST-2051',
    first_name: 'Rohan',
    last_name: 'Verma',
    email: 'rohan.verma@nexus.in',
    phone: '+91 98765 11223',
    age: 36,
    gender: 'Male',
    acquisition_channel: 'Partner Referral',
    customer_status: 'At-Risk',
    recency_days: 38,
    frequency_count: 15,
    monetary_value: 54000,
    cart_abandonment_count: 3,
  },
];

// POST /api/v1/ingestion/validate
router.post('/validate', async (req, res) => {
  try {
    const { raw_data, filename, use_sample } = req.body;

    const dataToValidate = use_sample ? SAMPLE_ENTERPRISE_DATASET : (raw_data || []);
    const fname = filename || (use_sample ? 'sample_enterprise_customers.csv' : 'uploaded_dataset.csv');

    const report = await service.validateDataset(dataToValidate, fname);
    res.json({
      success: true,
      data: report,
      message: 'Dataset validation report generated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
});

// POST /api/v1/ingestion/process
router.post('/process', async (req, res) => {
  try {
    const { raw_data, filename, mappings, use_sample } = req.body;

    let rows: Record<string, any>[] = use_sample ? SAMPLE_ENTERPRISE_DATASET : [];

    if (!use_sample && raw_data) {
      rows = service.parseDatasetInput(raw_data);
    }

    if (rows.length === 0) {
      rows = SAMPLE_ENTERPRISE_DATASET;
    }

    const fname = filename || (use_sample ? 'sample_enterprise_customers.csv' : 'uploaded_dataset.csv');
    const jobResult = await service.processDataset(fname, rows, mappings);

    res.json({
      success: true,
      data: jobResult,
      message: `Ingestion job completed successfully. Processed ${jobResult.success_count} customer records.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'PROCESSING_ERROR', message: err.message } });
  }
});

// GET /api/v1/ingestion/jobs
router.get('/jobs', (req, res) => {
  try {
    const jobs = service.getJobHistory();
    res.json({
      success: true,
      data: jobs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/ingestion/jobs/:id
router.get('/jobs/:id', (req, res) => {
  try {
    const job = service.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ingestion job not found.' } });
    }
    res.json({
      success: true,
      data: job,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
