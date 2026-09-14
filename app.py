import os
import sys
import time

# ============================================================
# PROJECT PATH
# ============================================================

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ============================================================
# IMPORTS
# ============================================================

import spaces
import gradio as gr

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from ml.inference.unified_inference import inference_service


# ============================================================
# CONFIGURATION
# ============================================================

PORT = int(os.getenv("PORT", "7860"))

# Application API key.
# Configure this in Hugging Face:
# Settings → Variables and secrets → New secret
#
# Name:
# MODEL_API_KEY
#
LIVE_API_KEY = os.getenv("MODEL_API_KEY", "")


# ============================================================
# ZEROGPU PROBE
# ============================================================
#
# This function exists so Hugging Face ZeroGPU can detect
# a @spaces.GPU function during startup.
#
# IMPORTANT:
# Actual ML inference remains CPU-based.
#
# ============================================================

@spaces.GPU(duration=10)
def zerogpu_probe():
    return "ZeroGPU probe OK"


# ============================================================
# FASTAPI APPLICATION
# ============================================================

fastapi_app = FastAPI(
    title="Customer360 AI",
    description="Customer Decision Intelligence Platform",
    version="1.0.0",
)


# ============================================================
# REQUEST MODEL
# ============================================================

class CustomerRequest(BaseModel):
    customer_id: str
    name: str

    # RFM
    recency_days: int
    frequency_purchases: int
    monetary_total_spend: float

    # Engagement
    website_visits_30d: int
    product_views_30d: int
    cart_additions_30d: int
    cart_abandonments_30d: int
    support_tickets_30d: int
    engagement_change_pct: float

    # Preferences
    preferred_channel: str
    preferred_category: str


# ============================================================
# API KEY VALIDATION
# ============================================================

def validate_api_key(api_key: str | None):
    """
    Validate application API key.

    If MODEL_API_KEY is not configured:
    authentication is disabled for demo/testing.

    If MODEL_API_KEY is configured:
    supplied key must match it.
    """

    if not LIVE_API_KEY:
        return

    if api_key != LIVE_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )


# ============================================================
# HEALTH CHECK
# ============================================================

@fastapi_app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "Customer360 AI",
        "models_loaded": bool(inference_service.loaded),
        "inference_mode": "CPU",
        "zerogpu": True,
        "shap_enabled": False,
        "api_key_configured": bool(LIVE_API_KEY),
    }


# ============================================================
# COMMON INFERENCE FUNCTION
# ============================================================

def run_customer_inference(customer_dict):
    """
    Single inference entry point used by both:
    - FastAPI
    - Gradio

    IMPORTANT:
    Do NOT pass enable_shap here.

    unified_inference.py currently exposes:

        predict_customer_decision(customer_dict)

    """

    start_time = time.time()

    try:

        # ====================================================
        # IMPORTANT FIX
        # ====================================================
        #
        # DO NOT DO THIS:
        #
        # inference_service.predict_customer_decision(
        #     customer_dict,
        #     enable_shap=False
        # )
        #
        # The inference method does not accept enable_shap.
        #
        # ====================================================

        result = inference_service.predict_customer_decision(
            customer_dict
        )

        elapsed = time.time() - start_time

        print(
            f"[Inference] Completed successfully "
            f"in {elapsed:.3f}s"
        )

        return result

    except Exception as e:

        elapsed = time.time() - start_time

        print(
            f"[Inference] ERROR after "
            f"{elapsed:.3f}s: {e}"
        )

        return {
            "error": str(e)
        }


# ============================================================
# FASTAPI PREDICTION ENDPOINT
# ============================================================

@fastapi_app.post("/demo-predict")
def demo_predict(
    request: CustomerRequest,
    x_api_key: str | None = Header(default=None)
):

    # Validate API key
    validate_api_key(x_api_key)

    # Convert Pydantic model to dictionary
    customer_dict = request.model_dump()

    # Run inference
    return run_customer_inference(customer_dict)


# ============================================================
# GRADIO INFERENCE FUNCTION
# ============================================================

def predict_gradio(
    api_key,
    customer_id,
    name,

    recency_days,
    frequency_purchases,
    monetary_total_spend,

    website_visits_30d,
    product_views_30d,
    cart_additions_30d,
    cart_abandonments_30d,
    support_tickets_30d,
    engagement_change_pct,

    preferred_channel,
    preferred_category,
):

    # ========================================================
    # API KEY VALIDATION
    # ========================================================

    if LIVE_API_KEY:

        if api_key != LIVE_API_KEY:

            return {
                "error": "Invalid API key"
            }

    # ========================================================
    # BUILD CUSTOMER INPUT
    # ========================================================

    frequency = max(
        int(frequency_purchases),
        1
    )

    monetary = float(
        monetary_total_spend
    )

    customer_dict = {

        # ----------------------------------------------------
        # Basic information
        # ----------------------------------------------------

        "customer_id": str(customer_id),

        "name": str(name),

        # ----------------------------------------------------
        # RFM
        # ----------------------------------------------------

        "recency_days": int(
            recency_days
        ),

        "frequency_purchases": int(
            frequency_purchases
        ),

        "monetary_total_spend": monetary,

        # ----------------------------------------------------
        # Engagement
        # ----------------------------------------------------

        "website_visits_30d": int(
            website_visits_30d
        ),

        "product_views_30d": int(
            product_views_30d
        ),

        "cart_additions_30d": int(
            cart_additions_30d
        ),

        "cart_abandonments_30d": int(
            cart_abandonments_30d
        ),

        "support_tickets_30d": int(
            support_tickets_30d
        ),

        "engagement_change_pct": float(
            engagement_change_pct
        ),

        # ----------------------------------------------------
        # Preferences
        # ----------------------------------------------------

        "preferred_channel": str(
            preferred_channel
        ),

        "preferred_category": str(
            preferred_category
        ),

        # ====================================================
        # DERIVED FEATURES
        # ====================================================

        "avg_order_value": (
            monetary / frequency
        ),

        # Defaults because these are not currently collected
        # by the Gradio interface.

        "email_opens_30d": 0,

        "email_clicks_30d": 0,

        "return_rate": 0.0,

        "discount_dependency_ratio": 0.0,

        "spend_30d": monetary,

        "spend_90d": monetary,

        "purchase_velocity": float(
            frequency_purchases
        ),
    }

    # ========================================================
    # RUN INFERENCE
    # ========================================================

    return run_customer_inference(
        customer_dict
    )


# ============================================================
# GRADIO UI
# ============================================================

with gr.Blocks(
    title="Customer360 AI"
) as demo:

    # ========================================================
    # HEADER
    # ========================================================

    gr.Markdown(
        """
        # Customer360 AI

        ### Customer Decision Intelligence Platform

        **Understand → Predict → Explain → Decide → Personalize → Act**
        """
    )

    # ========================================================
    # ZEROGPU PROBE
    # ========================================================
    #
    # Hidden because it is only required for ZeroGPU
    # detection/registration.
    #
    # ========================================================

    zerogpu_button = gr.Button(
        "ZeroGPU Probe",
        visible=False
    )

    zerogpu_button.click(
        fn=zerogpu_probe,
        inputs=[],
        outputs=[]
    )

    # ========================================================
    # API KEY
    # ========================================================

    api_key = gr.Textbox(
        label="API Key",
        type="password",
        placeholder="Enter API key"
    )

    # ========================================================
    # CUSTOMER INFORMATION
    # ========================================================

    gr.Markdown(
        "## Customer Information"
    )

    customer_id = gr.Textbox(
        label="Customer ID",
        value="CUST001"
    )

    name = gr.Textbox(
        label="Customer Name",
        value="Demo Customer"
    )

    # ========================================================
    # RFM SIGNALS
    # ========================================================

    gr.Markdown(
        "## RFM Signals"
    )

    with gr.Row():

        recency_days = gr.Number(
            label="Recency Days",
            value=30
        )

        frequency_purchases = gr.Number(
            label="Frequency Purchases",
            value=5
        )

        monetary_total_spend = gr.Number(
            label="Total Spend",
            value=25000
        )

    # ========================================================
    # ENGAGEMENT SIGNALS
    # ========================================================

    gr.Markdown(
        "## Engagement Signals"
    )

    with gr.Row():

        website_visits_30d = gr.Number(
            label="Website Visits (30d)",
            value=20
        )

        product_views_30d = gr.Number(
            label="Product Views (30d)",
            value=30
        )

        cart_additions_30d = gr.Number(
            label="Cart Additions (30d)",
            value=4
        )

    with gr.Row():

        cart_abandonments_30d = gr.Number(
            label="Cart Abandonments (30d)",
            value=2
        )

        support_tickets_30d = gr.Number(
            label="Support Tickets (30d)",
            value=1
        )

        engagement_change_pct = gr.Number(
            label="Engagement Change %",
            value=-20
        )

    # ========================================================
    # CUSTOMER PREFERENCES
    # ========================================================

    gr.Markdown(
        "## Customer Preferences"
    )

    preferred_channel = gr.Dropdown(
        label="Preferred Channel",

        choices=[
            "email",
            "sms",
            "whatsapp",
            "push",
            "web"
        ],

        value="email"
    )

    preferred_category = gr.Dropdown(
        label="Preferred Category",

        choices=[
            "electronics",
            "fashion",
            "home",
            "beauty",
            "sports"
        ],

        value="electronics"
    )

    # ========================================================
    # PREDICT BUTTON
    # ========================================================

    predict_button = gr.Button(
        "Run Customer360 Analysis",
        variant="primary"
    )

    # ========================================================
    # RESULT
    # ========================================================

    result = gr.JSON(
        label="Customer Decision Intelligence"
    )

    # ========================================================
    # EVENT
    # ========================================================

    predict_button.click(

        fn=predict_gradio,

        inputs=[
            api_key,

            customer_id,
            name,

            recency_days,
            frequency_purchases,
            monetary_total_spend,

            website_visits_30d,
            product_views_30d,
            cart_additions_30d,

            cart_abandonments_30d,
            support_tickets_30d,
            engagement_change_pct,

            preferred_channel,
            preferred_category,
        ],

        outputs=result
    )


# ============================================================
# MOUNT GRADIO INTO FASTAPI
# ============================================================

app = gr.mount_gradio_app(
    fastapi_app,
    demo,
    path="/"
)


# ============================================================
# ZEROGPU STARTUP HOOK
# ============================================================

try:

    import spaces.zero as _spaces_zero

    if hasattr(
        _spaces_zero,
        "startup"
    ):

        _spaces_zero.startup()

        print(
            "[ZeroGPU] Startup hook "
            "executed successfully."
        )

except Exception as e:

    print(
        f"[ZeroGPU] Startup hook warning: {e}"
    )


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print("=" * 60)

    print(
        "[Customer360 AI] "
        "Starting application"
    )

    print(
        f"[Customer360 AI] "
        f"Port: {PORT}"
    )

    print(
        "[Customer360 AI] "
        f"Models loaded: "
        f"{inference_service.loaded}"
    )

    print(
        "[Customer360 AI] "
        "Inference mode: CPU"
    )

    print(
        "[Customer360 AI] "
        "ZeroGPU mode: enabled"
    )

    print(
        "[Customer360 AI] "
        "SHAP: disabled for live inference"
    )

    print(
        "[Customer360 AI] "
        f"API key configured: "
        f"{bool(LIVE_API_KEY)}"
    )

    print("=" * 60)

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT
    )
