import os
import random
import numpy as np
import pandas as pd

def generate_customer_dataset(num_customers=500, random_seed=42):
    np.random.seed(random_seed)
    random.seed(random_seed)
    
    first_names = ["Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Neha", "Aditya", "Sanya", "Kabir", "Meera",
                   "Rahul", "Pooja", "Arjun", "Kavya", "Siddharth", "Ishita", "Varun", "Riya", "Karan", "Tanvi"]
    last_names = ["Sharma", "Verma", "Gupta", "Patel", "Mehta", "Singh", "Kumar", "Chawla", "Joshi", "Rao"]
    
    channels = ["WhatsApp", "Email", "Push", "SMS", "Phone"]
    categories = ["Electronics", "Fashion", "Home & Kitchen", "Beauty & Care", "Sports & Fitness"]
    
    customers = []
    
    for i in range(1001, 1001 + num_customers):
        customer_id = f"C{i}"
        fname = random.choice(first_names)
        lname = random.choice(last_names)
        name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}{random.randint(10, 99)}@example.com"
        
        join_days_ago = random.randint(30, 700)
        join_date = "2024-01-15"
        
        preferred_channel = random.choice(channels)
        preferred_category = random.choice(categories)
        
        archetype = np.random.choice(["loyal", "at_risk", "high_intent", "low_active", "dormant"], p=[0.25, 0.20, 0.20, 0.20, 0.15])
        
        if archetype == "loyal":
            recency_days = random.randint(1, 20)
            frequency_purchases = random.randint(12, 45)
            avg_order_val = float(np.random.uniform(2500, 15000))
            website_visits = random.randint(15, 60)
            product_views = random.randint(25, 100)
            cart_additions = random.randint(5, 20)
            cart_abandonments = random.randint(0, 3)
            email_opens = random.randint(8, 25)
            email_clicks = random.randint(4, 15)
            support_tickets = random.randint(0, 2)
            engagement_change_pct = float(np.random.uniform(5, 40))
            return_rate = float(np.random.uniform(0.01, 0.08))
            discount_dependency = float(np.random.uniform(0.1, 0.35))
        elif archetype == "at_risk":
            recency_days = random.randint(45, 120)
            frequency_purchases = random.randint(8, 30)
            avg_order_val = float(np.random.uniform(3000, 20000))
            website_visits = random.randint(1, 8)
            product_views = random.randint(2, 12)
            cart_additions = random.randint(1, 4)
            cart_abandonments = random.randint(2, 6)
            email_opens = random.randint(0, 4)
            email_clicks = random.randint(0, 2)
            support_tickets = random.randint(2, 7)
            engagement_change_pct = float(np.random.uniform(-75, -25))
            return_rate = float(np.random.uniform(0.10, 0.30))
            discount_dependency = float(np.random.uniform(0.3, 0.70))
        elif archetype == "high_intent":
            recency_days = random.randint(3, 30)
            frequency_purchases = random.randint(2, 10)
            avg_order_val = float(np.random.uniform(1500, 8000))
            website_visits = random.randint(20, 70)
            product_views = random.randint(40, 120)
            cart_additions = random.randint(8, 25)
            cart_abandonments = random.randint(4, 10)
            email_opens = random.randint(10, 30)
            email_clicks = random.randint(6, 20)
            support_tickets = random.randint(0, 1)
            engagement_change_pct = float(np.random.uniform(20, 90))
            return_rate = float(np.random.uniform(0.02, 0.10))
            discount_dependency = float(np.random.uniform(0.4, 0.8))
        elif archetype == "low_active":
            recency_days = random.randint(15, 60)
            frequency_purchases = random.randint(1, 5)
            avg_order_val = float(np.random.uniform(800, 3000))
            website_visits = random.randint(4, 15)
            product_views = random.randint(5, 20)
            cart_additions = random.randint(1, 5)
            cart_abandonments = random.randint(0, 3)
            email_opens = random.randint(2, 8)
            email_clicks = random.randint(1, 4)
            support_tickets = random.randint(0, 2)
            engagement_change_pct = float(np.random.uniform(-15, 15))
            return_rate = float(np.random.uniform(0.03, 0.12))
            discount_dependency = float(np.random.uniform(0.2, 0.5))
        else: # dormant
            recency_days = random.randint(90, 200)
            frequency_purchases = random.randint(1, 3)
            avg_order_val = float(np.random.uniform(500, 2500))
            website_visits = random.randint(0, 2)
            product_views = random.randint(0, 4)
            cart_additions = random.randint(0, 1)
            cart_abandonments = random.randint(0, 2)
            email_opens = random.randint(0, 2)
            email_clicks = random.randint(0, 1)
            support_tickets = random.randint(0, 4)
            engagement_change_pct = float(np.random.uniform(-90, -40))
            return_rate = float(np.random.uniform(0.05, 0.25))
            discount_dependency = float(np.random.uniform(0.3, 0.9))
            
        monetary_total_spend = round(frequency_purchases * avg_order_val, 2)
        spend_30d = round(monetary_total_spend * (0.3 if recency_days <= 30 else 0.0), 2)
        spend_90d = round(monetary_total_spend * (0.7 if recency_days <= 90 else 0.1), 2)
        purchase_velocity = float(round(max(5.0, join_days_ago / max(1, frequency_purchases)), 1))
        
        churn_raw = (
            0.035 * recency_days
            + 0.15 * cart_abandonments
            + 0.25 * support_tickets
            - 0.02 * website_visits
            - 0.02 * email_clicks
            - 0.03 * engagement_change_pct
            + (15.0 if recency_days > 60 else 0.0)
        )
        churn_prob = 1.0 / (1.0 + np.exp(-(churn_raw - 1.5)))
        churn_label = 1 if churn_prob > 0.50 else 0
        
        prop_raw = (
            0.04 * product_views
            + 0.08 * cart_additions
            + 0.05 * email_clicks
            + 0.02 * engagement_change_pct
            - 0.02 * recency_days
            - 0.30 * support_tickets
        )
        prop_prob = 1.0 / (1.0 + np.exp(-(prop_raw - 1.0)))
        purchase_intent_label = 1 if prop_prob > 0.50 else 0
        
        expected_years = 2.5
        retention_factor = max(0.1, 1.0 - churn_prob)
        annual_spend = (monetary_total_spend / max(1.0, join_days_ago / 365.0))
        clv_val = round(max(1000.0, annual_spend * expected_years * retention_factor), 2)
        
        row = {
            "customer_id": customer_id,
            "name": name,
            "email": email,
            "join_date": join_date,
            "preferred_channel": preferred_channel,
            "preferred_category": preferred_category,
            "recency_days": recency_days,
            "frequency_purchases": frequency_purchases,
            "monetary_total_spend": monetary_total_spend,
            "avg_order_value": round(avg_order_val, 2),
            "website_visits_30d": website_visits,
            "product_views_30d": product_views,
            "cart_additions_30d": cart_additions,
            "cart_abandonments_30d": cart_abandonments,
            "email_opens_30d": email_opens,
            "email_clicks_30d": email_clicks,
            "support_tickets_30d": support_tickets,
            "engagement_change_pct": round(engagement_change_pct, 1),
            "return_rate": round(return_rate, 3),
            "discount_dependency_ratio": round(discount_dependency, 3),
            "spend_30d": spend_30d,
            "spend_90d": spend_90d,
            "purchase_velocity": purchase_velocity,
            "churn_label": churn_label,
            "purchase_intent_label": purchase_intent_label,
            "clv": clv_val,
            "archetype": archetype
        }
        customers.append(row)
        
    df = pd.DataFrame(customers)
    
    os.makedirs("ml/data", exist_ok=True)
    csv_path = "ml/data/customer_signals.csv"
    df.to_csv(csv_path, index=False)
    print(f"[Dataset Generator] Successfully generated {len(df)} customer records saved to {csv_path}")
    return df

if __name__ == "__main__":
    generate_customer_dataset()
