from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.customers import router as customers_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.interactions import router as interactions_router
from app.api.v1.predictions import router as predictions_router
from app.api.v1.explanations import router as explanations_router
from app.api.v1.actions import router as actions_router
from app.api.v1.analytics import router as analytics_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(customers_router)
api_v1_router.include_router(transactions_router)
api_v1_router.include_router(interactions_router)
api_v1_router.include_router(predictions_router)
api_v1_router.include_router(explanations_router)
api_v1_router.include_router(actions_router)
api_v1_router.include_router(analytics_router)


