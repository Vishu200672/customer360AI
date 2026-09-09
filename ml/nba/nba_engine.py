from typing import Dict, Any, List

CANDIDATE_ACTIONS = [
    "NO_ACTION",
    "REMINDER",
    "RECOMMEND_PRODUCT",
    "CROSS_SELL",
    "UPSELL",
    "LOYALTY_OFFER",
    "WIN_BACK",
    "RETENTION_DISCOUNT"
]

PRODUCT_CATALOG = {
    "Electronics": ["Wireless Noise-Canceling Headphones", "Smart Fitness Watch Ultra", "Portable Power Bank 20000mAh", "4K Action Camera"],
    "Fashion": ["Premium Leather Jacket", "Designer Sunglasses Collection", "Organic Cotton Casual Hoodie", "Ergonomic Running Shoes"],
    "Home & Kitchen": ["Smart Espresso Coffee Maker", "Robot Vacuum Cleaner Pro", "Air Fryer XL Stainless Steel", "Ergonomic Office Desk Chair"],
    "Beauty & Care": ["Hydrating Skincare Serum Bundle", "Sonic Electric Toothbrush", "Luxury Aromatherapy Diffuser"],
    "Sports & Fitness": ["Adjustable Dumbbell Set 24kg", "Premium Non-Slip Yoga Mat", "Smart Jump Rope with Counter"]
}

class NextBestActionEngine:
    def __init__(self):
        pass

    def evaluate_next_best_action(
        self,
        customer_profile: Dict[str, Any],
        churn_prob: float,
        purchase_intent_prob: float,
        clv_estimate: float,
        segment: str,
        shap_explanations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        recency = customer_profile.get("recency_days", 30)
        abandoned_carts = customer_profile.get("cart_abandonments_30d", 0)
        support_tickets = customer_profile.get("support_tickets_30d", 0)
        preferred_channel = customer_profile.get("preferred_channel", "Email")
        preferred_category = customer_profile.get("preferred_category", "Electronics")
        monetary = customer_profile.get("monetary_total_spend", 5000)
        
        scores = {}
        
        scores["RETENTION_DISCOUNT"] = (
            1.5 * churn_prob
            + 0.5 * (1.0 if monetary > 15000 else 0.4)
            + 0.3 * (1.0 if abandoned_carts > 0 else 0.0)
            + 0.2 * (1.0 if support_tickets > 1 else 0.0)
        )
        
        scores["LOYALTY_OFFER"] = (
            1.2 * (1.0 - churn_prob)
            + 1.0 * (1.0 if segment in ["High Value Loyal", "High Value At Risk"] else 0.2)
            + 0.4 * (1.0 if monetary > 25000 else 0.1)
        )
        
        scores["WIN_BACK"] = (
            1.2 * (1.0 if recency > 45 else 0.1)
            + 0.8 * churn_prob
            + 0.3 * (1.0 if segment == "Dormant" else 0.2)
        )
        
        scores["UPSELL"] = (
            1.4 * purchase_intent_prob
            + 0.6 * (1.0 - churn_prob)
            + 0.4 * (1.0 if monetary > 10000 else 0.2)
        )
        
        scores["CROSS_SELL"] = (
            1.2 * purchase_intent_prob
            + 0.5 * (1.0 if recency < 30 else 0.2)
            + 0.3 * (1.0 if customer_profile.get("product_views_30d", 0) > 10 else 0.1)
        )
        
        scores["RECOMMEND_PRODUCT"] = (
            1.0 * purchase_intent_prob
            + 0.5 * (1.0 if customer_profile.get("product_views_30d", 0) <= 10 else 0.2)
        )
        
        scores["REMINDER"] = (
            1.4 * (1.0 if abandoned_carts > 0 else 0.0)
            + 0.5 * (1.0 - churn_prob)
            + 0.3 * (1.0 if recency <= 14 else 0.1)
        )
        
        scores["NO_ACTION"] = 0.5 if (churn_prob < 0.25 and purchase_intent_prob < 0.25 and monetary < 3000) else 0.1
        
        top_action = max(scores, key=scores.get)
        max_score = scores[top_action]
        confidence = float(min(0.98, max(0.60, max_score / 2.5)))

        category_products = PRODUCT_CATALOG.get(preferred_category, PRODUCT_CATALOG["Electronics"])
        recommended_product = category_products[hash(customer_profile.get("customer_id", "C1000")) % len(category_products)]
        
        offer = "Standard catalog view"
        timing = "Within 48 hours"
        objective = "Engage customer"
        
        if top_action == "RETENTION_DISCOUNT":
            offer = "20% Exclusive Retention Discount" if monetary > 20000 else "15% Special Stay-With-Us Discount"
            timing = "Immediate (Within 4 hours)"
            objective = "Mitigate high churn risk and protect customer lifetime value"
        elif top_action == "LOYALTY_OFFER":
            offer = "Complimentary VIP Upgrade & 10% Loyalty Rebate"
            timing = "Within 24 hours"
            objective = "Reward & deepen engagement with high-value customer"
        elif top_action == "WIN_BACK":
            offer = "Rs.500 Welcome Back Voucher + Free Express Shipping"
            timing = "Within 24 hours via " + preferred_channel
            objective = "Re-activate inactive customer signal"
        elif top_action == "UPSELL":
            offer = "Upgrade to Pro Tier with 10% Bundle Discount"
            timing = "Next active session / Within 12 hours"
            objective = "Maximize order value and purchase propensity"
        elif top_action == "CROSS_SELL":
            offer = "15% off when paired with your previous purchase"
            timing = "Within 24 hours"
            objective = "Drive cross-category discovery"
        elif top_action == "RECOMMEND_PRODUCT":
            offer = "Trending in your preferred category"
            timing = "Within 3 days"
            objective = "Increase product engagement"
        elif top_action == "REMINDER":
            offer = "Items reserved in your cart -- Complete order today"
            timing = "Within 2 hours"
            objective = "Recover abandoned cart revenue"
        else:
            offer = "No incentive required"
            timing = "Routine schedule"
            objective = "Maintain baseline engagement"

        top_shap_driver = shap_explanations[0]['label'] if shap_explanations else "Recency"
        top_shap_val = shap_explanations[0]['value'] if shap_explanations else str(recency)

        trace = [
            f"1. Customer {customer_profile.get('customer_id', '')} classified as segment '{segment}'.",
            f"2. Churn Risk evaluated at {churn_prob*100:.1f}% (CLV estimated at Rs.{clv_estimate:,.0f}).",
            f"3. Purchase Intent evaluated at {purchase_intent_prob*100:.1f}%.",
            f"4. Key behavioral driver: {top_shap_driver} ({top_shap_val}).",
            f"5. Candidate action '{top_action}' achieved highest weighted score ({max_score:.2f}).",
            f"6. Selected preferred delivery channel: {preferred_channel}.",
            f"7. Final decision compiled with target product '{recommended_product}' and offer '{offer}'."
        ]

        return {
            "action": top_action,
            "product": recommended_product,
            "offer": offer,
            "channel": preferred_channel,
            "timing": timing,
            "objective": objective,
            "confidence_score": round(confidence, 2),
            "action_score": round(max_score, 2),
            "candidate_scores": {k: round(v, 2) for k, v in scores.items()},
            "decision_trace": trace
        }
