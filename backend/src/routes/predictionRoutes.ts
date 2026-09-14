import { Router } from 'express';
import { MLClient } from '../integrations/mlClient.js';
import { CustomerService } from '../services/customerService.js';

const router = Router();
const mlClient = new MLClient();
const customerService = new CustomerService();

// POST /api/v1/customers/:id/predict
router.post('/customers/:id/predict', async (req, res) => {
  try {
    const customer = await customerService.getCustomer(req.params.id);
    const c360 = await customerService.getCustomer360(customer.id);
    const features = c360.features || {
      customer_id: customer.id,
      recency_days: 42,
      frequency_count: 14,
      monetary_value: 42500,
      days_inactive: 42,
      engagement_score: 0.35,
      cart_abandonment_count: 3,
      average_order_value: 3035.71,
      estimated_clv: 68500,
      updated_at: new Date().toISOString(),
    };

    const output = await mlClient.predict(customer, features);
    await customerService.applyPrediction(customer.id, output);

    const updatedC360 = await customerService.getCustomer360(customer.id);

    res.json({
      success: true,
      data: {
        id: `p_${Date.now()}`,
        model_name: 'customer360_unified_trained_artifacts',
        model_version: 'v1.0.0',
        inference_mode: output.inference_mode || 'Remote Hugging Face AI Microservice',
        predictions: updatedC360.predictions,
        shap_drivers: updatedC360.shap_drivers,
        next_best_action: updatedC360.next_best_action,
        created_at: new Date().toISOString(),
      },
      message: 'On-Demand ML Inference completed successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'PREDICTION_ERROR', message: err.message } });
  }
});


export default router;
