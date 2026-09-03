"""
Streamlit Web Application for Indian Artisan Fair-Price ML Model
Run with: streamlit run web_app.py
"""
import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import streamlit as st
from model import ArtisanPricePredictor, CostEngine, KNOWN_MATERIALS, KNOWN_TECHNIQUES, KNOWN_CATEGORIES

st.set_page_config(
    page_title="Indian Artisan Fair-Price ML Model",
    page_icon="🎨",
    layout="wide"
)

# Header UI
st.title("🇮🇳 Indian Artisan Fair-Price ML Model")
st.markdown("### Powered by CatBoost Quantile ML & Real Live Google Shopping India Comps (SerperAPI)")
st.info("Ensures fair wages, material cost grounding, and market-aligned pricing for Indian artisans.")

# Load Model Predictor with caching
@st.cache_resource
def load_predictor():
    serper_key = os.getenv("SERPER_API_KEY", "")
    if not serper_key or serper_key == "your_serper_api_key_here":
        st.error("⚠️ SERPER_API_KEY is missing in .env file. Please add your key to enable live predictions.")
        st.stop()
    return ArtisanPricePredictor(serper_api_key=serper_key, model_type="catboost")

with st.spinner("Scraping live training data & initializing CatBoost ML Model..."):
    predictor = load_predictor()

st.sidebar.header("🛠️ Artisan Input Form")

category = st.sidebar.selectbox("Craft Category", [c.title() for c in KNOWN_CATEGORIES])
title = st.sidebar.text_input("Product Title", "Handcrafted Dhokra Brass Peacock Statue")
material = st.sidebar.selectbox("Primary Material", [m.title() for m in KNOWN_MATERIALS])
technique = st.sidebar.selectbox("Craft Technique / Style", [t.title() for t in KNOWN_TECHNIQUES])
size = st.sidebar.selectbox("Item Size", ["Small", "Medium", "Large"], index=1)

materials_cost = st.sidebar.number_input("Materials Cost (₹)", min_value=10.0, value=350.0, step=50.0)
labor_hours = st.sidebar.number_input("Labor Hours Spent", min_value=0.5, value=5.0, step=0.5)
hourly_wage = st.sidebar.number_input("Target Hourly Wage (₹/hr)", min_value=100.0, value=250.0, step=25.0)

if st.sidebar.button("✨ Predict Fair Price Range", type="primary"):
    item_details = {
        "category": category.lower(),
        "title": title,
        "material": material.lower(),
        "technique": technique.lower(),
        "size": size.lower(),
        "materials_cost": materials_cost,
        "labor_hours": labor_hours,
        "hourly_wage": hourly_wage
    }

    with st.spinner("Fetching live Google Shopping India market comps & calculating predictions..."):
        res = predictor.predict_fair_price(item_details)

    pr = res["recommended_price_range_formatted"]
    cb = res["cost_breakdown"]
    ml = res["raw_ml_quantiles_formatted"]
    comps = res["live_comps_summary"]

    st.subheader("📊 Recommended Fair Price Range")
    col1, col2, col3 = st.columns(3)
    col1.metric("Low Price (Budget)", pr["low"])
    col2.metric("Median Fair Price (Recommended)", pr["median"])
    col3.metric("High Price (Premium Finish)", pr["high"])

    if res["safety_envelope_applied"]:
        st.warning("⚠️ **Cost Floor Safety Envelope Applied**: Price range adjusted upwards to guarantee minimum cost floor + 20% margin.")

    st.markdown("---")
    st.subheader("💰 Cost Floor Breakdown")
    c1, c2, c3 = st.columns(3)
    c1.write(f"**Materials Cost:** {cb['materials_cost_formatted']}")
    c2.write(f"**Labor ({labor_hours} hrs @ {CostEngine.format_inr(hourly_wage)}/hr):** {cb['labor_cost_formatted']}")
    c3.write(f"**Net Cost Floor (incl. 15% Platform/GST):** {cb['net_cost_floor_formatted']}")

    st.markdown("---")
    st.subheader("🛍️ Live Google Shopping India Comps (SerperAPI)")
    st.write(f"**Found {comps['comp_count']} live comparable market listings.** Market Median: **{comps['comp_median_formatted']}**")

    if comps["sample_comps"]:
        comps_data = []
        for c in comps["sample_comps"]:
            comps_data.append({
                "Listing Title": c["title"],
                "Price (INR)": CostEngine.format_inr(c["price"]),
                "Seller Source": c.get("source", "Merchant"),
                "Similarity Match Score": f"{c.get('similarity_score', 1.0) * 100:.1f}%"
            })
        st.dataframe(comps_data, use_container_width=True)

st.markdown("---")
st.caption("Indian Artisan Fair-Price ML System • Trained 100% on Live SerperAPI Google Shopping Data")
