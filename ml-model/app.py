import os
import sys

# Ensure project root is in sys.path BEFORE importing ml modules
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import json
from fastapi import FastAPI, HTTPException, Header, status, Query
from pydantic import BaseModel
import gradio as gr

from ml.inference.unified_inference import inference_service

LIVE_API_KEY = os.getenv("MODEL_API_KEY", "c360_live_key_9f8a2b7c4e1d")

# 1. Initialize FastAPI app
fastapi_app = FastAPI(
    title="Customer360 AI Model API",
    description="24/7 Production ML Inference Engine for Customer Churn, CLV, Propensity, and NBA",
    version="1.0.0"
)

# 2. Add FastAPI Routes (Health & Public API)
@fastapi_app.get("/health")
def health_check():
    """Endpoint for UptimeRobot 24/7 monitoring"""
    return {
        "status": "healthy",
        "service": "Customer360 AI Model",
        "models_loaded": inference_service.loaded,
        "api_key_configured": True
    }

@fastapi_app.get("/demo-predict")
def demo_predict(recency_days: int = 74, abandoned_carts: int = 2, support_tickets: int = 3):
    cust_dict = {
        "customer_id": "DEMO_C1024",
        "name": "Ananya Sharma",
        "recency_days": recency_days,
        "frequency_purchases": 12,
        "monetary_total_spend": 45000.0,
        "avg_order_value": 3750.0,
        "website_visits_30d": 3,
        "product_views_30d": 5,
        "cart_additions_30d": 3,
        "cart_abandonments_30d": abandoned_carts,
        "email_opens_30d": 1,
        "email_clicks_30d": 0,
        "support_tickets_30d": support_tickets,
        "engagement_change_pct": -65.0,
        "return_rate": 0.08,
        "discount_dependency_ratio": 0.35,
        "spend_30d": 0.0,
        "spend_90d": 15000.0,
        "purchase_velocity": 30.0,
        "preferred_channel": "WhatsApp",
        "preferred_category": "Electronics"
    }
    return inference_service.predict_customer_decision(cust_dict)

# 3. Gradio Predict Function
def predict_gradio(
    customer_id, name, recency_days, frequency_purchases, monetary_total_spend,
    website_visits_30d, product_views_30d, cart_additions_30d, cart_abandonments_30d,
    support_tickets_30d, engagement_change_pct, preferred_channel, preferred_category,
    api_key_input
):
    if api_key_input != LIVE_API_KEY:
        return {"error": "Unauthorized: Invalid API Key. Please provide the correct X-API-Key."}

    cust_dict = {
        "customer_id": customer_id or "C1024",
        "name": name or "Sample Customer",
        "recency_days": int(recency_days),
        "frequency_purchases": int(frequency_purchases),
        "monetary_total_spend": float(monetary_total_spend),
        "avg_order_value": float(monetary_total_spend) / max(1, int(frequency_purchases)),
        "website_visits_30d": int(website_visits_30d),
        "product_views_30d": int(product_views_30d),
        "cart_additions_30d": int(cart_additions_30d),
        "cart_abandonments_30d": int(cart_abandonments_30d),
        "email_opens_30d": 5,
        "email_clicks_30d": 2,
        "support_tickets_30d": int(support_tickets_30d),
        "engagement_change_pct": float(engagement_change_pct),
        "return_rate": 0.08,
        "discount_dependency_ratio": 0.35,
        "spend_30d": 0.0,
        "spend_90d": 15000.0,
        "purchase_velocity": 30.0,
        "preferred_channel": preferred_channel,
        "preferred_category": preferred_category
    }

    return inference_service.predict_customer_decision(cust_dict)

# 4. Build Gradio Interface
with gr.Blocks(title="Customer360 AI -- Live Model Studio") as demo:
    gr.Markdown("# 🧠 Customer360 AI -- Live Model Decision Engine")
    gr.Markdown("Direct Hugging Face 24/7 Live Deployment with Uptime Monitoring & API Key Protection.")
    
    with gr.Row():
        with gr.Column():
            api_key_input = gr.Textbox(label="Live API Key", value="c360_live_key_9f8a2b7c4e1d", type="password")
            customer_id = gr.Textbox(label="Customer ID", value="C1024")
            name = gr.Textbox(label="Customer Name", value="Ananya Sharma")
            recency_days = gr.Number(label="Days Inactive", value=74)
            frequency_purchases = gr.Number(label="Total Purchases", value=12)
            monetary_total_spend = gr.Number(label="Lifetime Spend (INR)", value=45000)
            website_visits_30d = gr.Number(label="30-Day Website Visits", value=3)
            product_views_30d = gr.Number(label="30-Day Product Views", value=5)
            cart_additions_30d = gr.Number(label="30-Day Cart Additions", value=3)
            cart_abandonments_30d = gr.Number(label="30-Day Cart Abandonments", value=2)
            support_tickets_30d = gr.Number(label="30-Day Support Tickets", value=3)
            engagement_change_pct = gr.Number(label="Engagement Trend %", value=-65.0)
            preferred_channel = gr.Dropdown(label="Preferred Channel", choices=["WhatsApp", "Email", "Push", "SMS"], value="WhatsApp")
            preferred_category = gr.Dropdown(label="Preferred Category", choices=["Electronics", "Fashion", "Home & Kitchen"], value="Electronics")
            btn = gr.Button("🚀 Run Live Inference", variant="primary")

        with gr.Column():
            output_json = gr.JSON(label="ML Prediction & Next Best Action Result")

    btn.click(
        fn=predict_gradio,
        inputs=[
            customer_id, name, recency_days, frequency_purchases, monetary_total_spend,
            website_visits_30d, product_views_30d, cart_additions_30d, cart_abandonments_30d,
            support_tickets_30d, engagement_change_pct, preferred_channel, preferred_category,
            api_key_input
        ],
        outputs=output_json
    )

# Mount Gradio app onto FastAPI
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
