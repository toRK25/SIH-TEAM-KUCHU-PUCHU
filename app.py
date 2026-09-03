"""
Interactive CLI & API Interface for Indian Artisan Fair-Price ML Model (INR / ₹)
Expanded Vocabulary: All Major Indian Local Handicrafts & Regional Craft Traditions
"""
import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from model import ArtisanPricePredictor, CostEngine


def run_demo():
    print("=" * 85)
    print("      INDIAN ARTISAN FAIR-PRICE ML RECOMMENDATION SYSTEM (INR / ₹)")
    print("      EXHAUSTIVE INDIAN HANDICRAFTS VOCABULARY & LIVE GOOGLE SHOPPING INDIA DATA")
    print("=" * 85)

    serper_key = os.getenv("SERPER_API_KEY", "")
    if not serper_key or serper_key == "your_serper_api_key_here":
        print("[CRITICAL ERROR] SERPER_API_KEY is missing or unconfigured in .env file.")
        sys.exit(1)

    print("[SerperAPI Status]: LIVE SerperAPI Key detected. Initializing live training & prediction engine...")
    predictor = ArtisanPricePredictor(serper_api_key=serper_key, model_type="catboost")

    sample_items = [
        {
            "name": "Handcrafted Dhokra Brass Peacock Figurine (Odisha)",
            "item_details": {
                "category": "brassware",
                "title": "Authentic Dhokra lost-wax casted brass peacock statue handmade in Odisha",
                "material": "brass",
                "technique": "dhokra",
                "size": "medium",
                "materials_cost": 350.00,
                "labor_hours": 5.0,
                "hourly_wage": 250.00,
                "seller_rating": 4.9,
                "review_count": 85
            }
        },
        {
            "name": "Chanderi Silk Handloom Saree (Madhya Pradesh)",
            "item_details": {
                "category": "saree",
                "title": "Pure Chanderi silk handloom saree with Zari border woven in MP",
                "material": "chanderi silk",
                "technique": "zardozi",
                "size": "large",
                "materials_cost": 1800.00,
                "labor_hours": 14.0,
                "hourly_wage": 250.00,
                "seller_rating": 4.8,
                "review_count": 140
            }
        },
        {
            "name": "Jaipur Blue Pottery Flower Vase (Rajasthan)",
            "item_details": {
                "category": "pottery",
                "title": "Traditional Jaipur Blue Pottery hand-painted quartz clay decorative vase",
                "material": "blue pottery",
                "technique": "blue pottery",
                "size": "medium",
                "materials_cost": 220.00,
                "labor_hours": 3.5,
                "hourly_wage": 200.00,
                "seller_rating": 4.7,
                "review_count": 62
            }
        },
        {
            "name": "Channapatna Wooden Lacquerware Toy Set (Karnataka)",
            "item_details": {
                "category": "woodcraft",
                "title": "Hand-turned natural vegetable dye Channapatna wooden stacking toy set",
                "material": "teak",
                "technique": "channapatna toys",
                "size": "small",
                "materials_cost": 150.00,
                "labor_hours": 3.0,
                "hourly_wage": 200.00,
                "seller_rating": 4.9,
                "review_count": 95
            }
        },
        {
            "name": "Madhubani Hand-Painted Canvas Painting (Bihar)",
            "item_details": {
                "category": "paintings",
                "title": "Traditional Mithila Madhubani hand-painted natural pigment wall artwork",
                "material": "paper-mache",
                "technique": "madhubani painting",
                "size": "medium",
                "materials_cost": 280.00,
                "labor_hours": 8.0,
                "hourly_wage": 250.00,
                "seller_rating": 4.8,
                "review_count": 50
            }
        }
    ]

    for sample in sample_items:
        print(f"\n[INDIAN ARTISAN ITEM]: {sample['name']}")
        print("-" * 70)
        res = predictor.predict_fair_price(sample["item_details"])

        cb = res["cost_breakdown"]
        pr_fmt = res["recommended_price_range_formatted"]
        ml_fmt = res["raw_ml_quantiles_formatted"]
        comps = res["live_comps_summary"]

        print(f" Cost Floor Breakdown (INR):")
        print(f"   - Materials Cost: {cb['materials_cost_formatted']}")
        print(f"   - Labor ({sample['item_details']['labor_hours']} hrs @ {CostEngine.format_inr(sample['item_details']['hourly_wage'])}/hr): {cb['labor_cost_formatted']}")
        print(f"   - Net Cost Floor (incl. 15% platform/GST fees): {cb['net_cost_floor_formatted']}")

        print(f"\n ML Model Quantile Predictions (Live CatBoost):")
        print(f"   - P15 (Low): {ml_fmt['low']} | P50 (Median): {ml_fmt['median']} | P85 (High): {ml_fmt['high']}")

        print(f"\n Live SerperAPI Google Shopping India Comps:")
        print(f"   - Comps Found: {comps['comp_count']}")
        print(f"   - Market Comps Median: {comps['comp_median_formatted']}")
        print(f"   - Top Live Market Sample Listings:")
        for idx, c in enumerate(comps["sample_comps"][:3], 1):
            title_short = (c['title'][:55] + '...') if len(c['title']) > 55 else c['title']
            print(f"     [{idx}] {title_short} | Price: {CostEngine.format_inr(c['price'])} | Source: {c.get('source', 'Merchant')}")

        print(f"\n Recommended Fair Price Range (Blended + Safety Envelope):")
        print(f"   >>> LOW:    {pr_fmt['low']}")
        print(f"   >>> MEDIAN: {pr_fmt['median']}")
        print(f"   >>> HIGH:   {pr_fmt['high']}")
        print(f"   Safety Envelope Adjustment Applied: {res['safety_envelope_applied']}")
        print("=" * 85)


if __name__ == "__main__":
    run_demo()
