"""
Fair-Price ML Model for Indian Artisans (INR / ₹)
Consolidated Engine: Cost Grounding, Feature Extraction, SerperAPI Live Comps, CatBoost Quantile Regressors.
"""
import os
import sys
import re
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from dotenv import load_dotenv

load_dotenv()

# System & Currency Defaults
CURRENCY_SYMBOL = "₹"
DEFAULT_PLATFORM_FEE_PCT = 0.15      # 15% platform commission + gateway tax overhead
DEFAULT_TARGET_HOURLY_WAGE = 250.0   # ₹250 / hour for skilled Indian artisans
DEFAULT_MIN_PROFIT_MARGIN = 0.20     # 20% minimum profit margin above cost floor

# SerperAPI Defaults
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
SERPER_API_URL = "https://google.serper.dev/shopping"
SERPER_COUNTRY_CODE = "in"
SERPER_LANGUAGE_CODE = "en"

# Indian Traditional Craft Materials & Techniques Vocabularies
KNOWN_MATERIALS = [
    "brass", "copper", "bronze", "panchaloha", "terracotta", "clay",
    "chanderi silk", "banarasi silk", "tussar silk", "kantha cotton", "mulmul cotton", "jute",
    "sandalwood", "teak wood", "rosewood", "sheesham wood", "bamboo", "cane", "marble"
]

KNOWN_TECHNIQUES = [
    "dhokra", "dokra", "bidriware", "blue pottery", "madhubani painting", "pattachitra",
    "chikankari", "zardozi", "kalamkari", "block printing", "ajrakh", "dabu print",
    "meenakari", "tanjore painting", "hand-loom", "hand-carved", "hand-woven", "filigree"
]


class CostEngine:
    """Computes cost-based price grounding to ensure artisans never price below cost floor."""

    @staticmethod
    def calculate_cost_floor(
        materials_cost: float,
        labor_hours: float,
        hourly_wage: float = DEFAULT_TARGET_HOURLY_WAGE,
        platform_fee_pct: float = DEFAULT_PLATFORM_FEE_PCT
    ) -> float:
        """Cost Floor (₹) = (Materials + Hours * Hourly Wage) / (1 - Platform Fee %)"""
        base_cost = max(0.0, float(materials_cost)) + max(0.0, float(labor_hours)) * max(0.0, float(hourly_wage))
        fee_denom = max(0.01, 1.0 - max(0.0, min(0.9, platform_fee_pct)))
        return round(base_cost / fee_denom, 2)

    @staticmethod
    def format_inr(amount: float) -> str:
        """Formats amount to INR string format e.g. ₹1,250.00"""
        return f"{CURRENCY_SYMBOL}{amount:,.2f}"

    @staticmethod
    def apply_safety_envelope(
        raw_low: float,
        raw_median: float,
        raw_high: float,
        cost_floor: float,
        min_profit_margin: float = DEFAULT_MIN_PROFIT_MARGIN
    ) -> Dict[str, Any]:
        """Enforces Low >= Cost Floor, Median >= Cost Floor * (1 + margin), High > Median."""
        min_allowed_low = cost_floor
        min_allowed_median = round(cost_floor * (1.0 + min_profit_margin), 2)

        final_low = max(min_allowed_low, float(raw_low))
        final_median = max(min_allowed_median, float(raw_median), final_low * 1.05)
        final_high = max(final_median * 1.15, float(raw_high))

        return {
            "cost_floor": cost_floor,
            "cost_floor_formatted": CostEngine.format_inr(cost_floor),
            "price_range": {
                "low": round(final_low, 2),
                "median": round(final_median, 2),
                "high": round(final_high, 2)
            },
            "price_range_formatted": {
                "low": CostEngine.format_inr(final_low),
                "median": CostEngine.format_inr(final_median),
                "high": CostEngine.format_inr(final_high)
            },
            "is_cost_adjusted": final_low > float(raw_low) or final_median > float(raw_median)
        }


class FeatureExtractor:
    """Extracts structured features from item descriptions & applies log transformations."""

    @staticmethod
    def extract_text_features(title: str, description: str = "") -> Dict[str, Any]:
        text = f"{title} {description}".lower()
        detected_materials = [m for m in KNOWN_MATERIALS if re.search(r'\b' + re.escape(m) + r'\b', text)]
        detected_techniques = [t for t in KNOWN_TECHNIQUES if re.search(r'\b' + re.escape(t) + r'\b', text)]

        return {
            "primary_material": detected_materials[0] if detected_materials else "traditional_material",
            "material_count": len(detected_materials),
            "primary_technique": detected_techniques[0] if detected_techniques else "handicraft",
            "technique_count": len(detected_techniques),
            "title_word_count": len(title.split())
        }

    def prepare_item_features(self, item: Dict[str, Any], cost_floor: float = 0.0) -> Dict[str, Any]:
        text_feats = self.extract_text_features(
            title=item.get("title", item.get("category", "")),
            description=item.get("description", "")
        )

        labor_hours = float(item.get("labor_hours", 2.0))
        materials_cost = float(item.get("materials_cost", 100.0))
        seller_rating = float(item.get("seller_rating", 4.5))
        review_count = float(item.get("review_count", 15.0))

        return {
            "category": str(item.get("category", "Handicrafts")).lower().strip(),
            "material": str(item.get("material", text_feats["primary_material"])).lower().strip(),
            "technique": str(item.get("technique", text_feats["primary_technique"])).lower().strip(),
            "size": str(item.get("size", "medium")).lower().strip(),
            "labor_hours": labor_hours,
            "materials_cost": materials_cost,
            "seller_rating": seller_rating,
            "review_count": review_count,
            "log_review_count": float(np.log1p(review_count)),
            "cost_floor": float(cost_floor),
            "log_cost_floor": float(np.log1p(cost_floor)),
            "material_count": text_feats["material_count"],
            "technique_count": text_feats["technique_count"],
            "title_word_count": text_feats["title_word_count"]
        }


class SerperCompMatcher:
    """Fetches real live Google Shopping India listings via SerperAPI & TF-IDF similarity ranks them."""

    def __init__(self, api_key: str = SERPER_API_KEY):
        self.api_key = api_key
        self.session = requests.Session()
        retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
        self.session.mount("https://", HTTPAdapter(max_retries=retries))

    def fetch_live_comps(self, query: str, num_results: int = 20) -> List[Dict[str, Any]]:
        """Strict live fetcher using SerperAPI."""
        if not self.api_key or self.api_key == "your_serper_api_key_here":
            raise ValueError("[SerperCompMatcher Error] Valid SERPER_API_KEY required in .env file.")

        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}
        clean_query = f"handmade {query} India".strip()
        payload = {"q": clean_query, "gl": SERPER_COUNTRY_CODE, "hl": SERPER_LANGUAGE_CODE, "num": num_results}

        try:
            response = self.session.post(SERPER_API_URL, json=payload, headers=headers, timeout=20)
            if response.status_code != 200:
                raise RuntimeError(f"[SerperAPI Error] HTTP {response.status_code}: {response.text}")

            shopping_results = response.json().get("shopping", [])
            comps = []
            for item in shopping_results:
                clean_price = self._parse_inr_price(item.get("price", ""))
                if clean_price and clean_price > 0:
                    comps.append({
                        "title": item.get("title", ""),
                        "price": clean_price,
                        "source": item.get("source", "Indian Craft Seller"),
                        "rating": item.get("rating", 4.5),
                        "link": item.get("link", "#")
                    })

            if not comps:
                raise RuntimeError(f"[SerperCompMatcher Error] Live SerperAPI query '{clean_query}' yielded 0 valid items.")

            print(f"[SerperAPI Live] Retrieved {len(comps)} real live market listings for '{clean_query}'.")
            return comps
        except Exception as e:
            raise RuntimeError(f"[SerperCompMatcher Exception] Live fetch failed for '{clean_query}': {e}")

    def filter_and_aggregate(self, target_title: str, raw_comps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Filters comps using TF-IDF cosine similarity against target_title."""
        if not raw_comps:
            raise ValueError("[SerperCompMatcher Error] Empty comps list.")

        titles = [target_title] + [c["title"] for c in raw_comps]
        try:
            tfidf_matrix = TfidfVectorizer(stop_words="english").fit_transform(titles)
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        except Exception:
            similarities = np.ones(len(raw_comps))

        filtered_comps = []
        for comp, sim_score in zip(raw_comps, similarities):
            comp_copy = comp.copy()
            comp_copy["similarity_score"] = float(round(sim_score, 3))
            if sim_score >= 0.35 or len(filtered_comps) < 5:
                filtered_comps.append(comp_copy)

        prices = [c["price"] for c in filtered_comps] if filtered_comps else [c["price"] for c in raw_comps]

        return {
            "filtered_comps": sorted(filtered_comps, key=lambda x: x.get("similarity_score", 0), reverse=True),
            "comp_count": len(prices),
            "median_price": float(round(np.median(prices), 2)),
            "p25_price": float(round(np.percentile(prices, 25), 2)),
            "p75_price": float(round(np.percentile(prices, 75), 2))
        }

    @staticmethod
    def _parse_inr_price(price_str: Any) -> float:
        if isinstance(price_str, (int, float)):
            return float(price_str)
        try:
            cleaned = str(price_str).replace(",", "")
            digits = "".join(c for c in cleaned if c.isdigit() or c == '.')
            return float(digits)
        except ValueError:
            return 0.0


class CatBoostQuantileModel:
    """Multi-Quantile CatBoost Regressor (P15, P50, P85) trained strictly on live market data."""

    def __init__(self, model_type: str = "catboost"):
        self.model_type = model_type.lower()
        self.quantiles = [0.15, 0.50, 0.85]
        self.models: Dict[float, Any] = {}
        self.is_trained = False
        self.categorical_cols = ["category", "material", "technique", "size"]
        self.numerical_cols = [
            "labor_hours", "materials_cost", "seller_rating",
            "review_count", "log_review_count", "cost_floor", "log_cost_floor"
        ]
        self.feature_columns = self.categorical_cols + self.numerical_cols

    def fit(self, df: pd.DataFrame, target_col: str = "price"):
        if df is None or len(df) == 0:
            raise ValueError("[CatBoostQuantileModel Error] Empty training dataset provided.")

        X = df[self.feature_columns].copy()
        y_log = np.log1p(df[target_col].values)

        self.preprocessor = ColumnTransformer(
            transformers=[
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), self.categorical_cols),
                ("num", "passthrough", self.numerical_cols)
            ]
        )
        X_trans = self.preprocessor.fit_transform(X)

        for alpha in self.quantiles:
            model = self._create_quantile_regressor(alpha)
            model.fit(X_trans, y_log)
            self.models[alpha] = model

        self.is_trained = True
        return self

    def predict(self, feature_dict: Dict[str, Any]) -> Dict[str, float]:
        if not self.is_trained:
            raise RuntimeError("[CatBoostQuantileModel Error] Model is not trained.")

        df_single = pd.DataFrame([feature_dict])
        for col in self.feature_columns:
            if col not in df_single.columns:
                df_single[col] = 0.0 if col in self.numerical_cols else "unknown"

        X_single = self.preprocessor.transform(df_single[self.feature_columns])

        predictions = {}
        quantile_keys = {0.15: "low", 0.50: "median", 0.85: "high"}
        for alpha, name in quantile_keys.items():
            pred_log = self.models[alpha].predict(X_single)[0]
            predictions[name] = round(max(0.0, float(np.expm1(pred_log))), 2)

        predictions["low"] = min(predictions["low"], predictions["median"])
        predictions["high"] = max(predictions["high"], predictions["median"])
        return predictions

    def _create_quantile_regressor(self, alpha: float):
        if self.model_type == "catboost":
            try:
                from catboost import CatBoostRegressor
                return CatBoostRegressor(loss_function=f"Quantile:alpha={alpha}", iterations=250, learning_rate=0.08, depth=6, verbose=0)
            except ImportError:
                self.model_type = "lightgbm"

        if self.model_type == "lightgbm":
            try:
                from lightgbm import LGBMRegressor
                return LGBMRegressor(objective="quantile", alpha=alpha, n_estimators=150, learning_rate=0.08, num_leaves=31, verbose=-1)
            except ImportError:
                self.model_type = "xgboost"

        from sklearn.ensemble import GradientBoostingRegressor
        return GradientBoostingRegressor(loss="quantile", alpha=alpha, n_estimators=100, learning_rate=0.08, max_depth=5)


class ArtisanPricePredictor:
    """Main Orchestrator blending live SerperAPI training, real-time live comp matching, and CatBoost Quantile predictions."""

    def __init__(self, serper_api_key: str = SERPER_API_KEY, model_type: str = "catboost"):
        if not serper_api_key or serper_api_key == "your_serper_api_key_here":
            raise ValueError("[ArtisanPricePredictor Error] Valid SERPER_API_KEY required in .env file.")

        self.cost_engine = CostEngine()
        self.feature_extractor = FeatureExtractor()
        self.comp_matcher = SerperCompMatcher(api_key=serper_api_key)
        self.model = CatBoostQuantileModel(model_type=model_type)

        print("[ArtisanPricePredictor] Scraping live training data from Google Shopping India via SerperAPI...")
        live_df = self._collect_live_training_dataset()
        self.model.fit(live_df, target_col="price")

    def predict_fair_price(self, item_details: Dict[str, Any]) -> Dict[str, Any]:
        materials_cost = float(item_details.get("materials_cost", 0.0))
        labor_hours = float(item_details.get("labor_hours", 1.0))
        hourly_wage = float(item_details.get("hourly_wage", DEFAULT_TARGET_HOURLY_WAGE))

        cost_floor = self.cost_engine.calculate_cost_floor(materials_cost, labor_hours, hourly_wage)
        features = self.feature_extractor.prepare_item_features(item_details, cost_floor=cost_floor)
        raw_model_preds = self.model.predict(features)

        search_query = f"{features['material']} {features['category']} {features['technique']}".strip()
        raw_comps = self.comp_matcher.fetch_live_comps(search_query)
        title = item_details.get("title", f"Handmade {features['material']} {features['category']}")
        comps_info = self.comp_matcher.filter_and_aggregate(title, raw_comps)

        comp_median = comps_info["median_price"]
        comp_p25 = comps_info["p25_price"]
        comp_p75 = comps_info["p75_price"]

        blended_low = 0.50 * raw_model_preds["low"] + 0.50 * comp_p25
        blended_median = 0.50 * raw_model_preds["median"] + 0.50 * comp_median
        blended_high = 0.50 * raw_model_preds["high"] + 0.50 * comp_p75

        final_result = self.cost_engine.apply_safety_envelope(blended_low, blended_median, blended_high, cost_floor)

        return {
            "currency": CURRENCY_SYMBOL,
            "cost_breakdown": {
                "labor_cost_formatted": CostEngine.format_inr(labor_hours * hourly_wage),
                "materials_cost_formatted": CostEngine.format_inr(materials_cost),
                "net_cost_floor_formatted": CostEngine.format_inr(cost_floor)
            },
            "raw_ml_quantiles_formatted": {
                "low": CostEngine.format_inr(raw_model_preds["low"]),
                "median": CostEngine.format_inr(raw_model_preds["median"]),
                "high": CostEngine.format_inr(raw_model_preds["high"])
            },
            "live_comps_summary": {
                "comp_count": comps_info["comp_count"],
                "comp_median_formatted": CostEngine.format_inr(comp_median),
                "sample_comps": comps_info["filtered_comps"][:5]
            },
            "recommended_price_range_formatted": final_result["price_range_formatted"],
            "safety_envelope_applied": final_result["is_cost_adjusted"]
        }

    def _collect_live_training_dataset(self) -> pd.DataFrame:
        categories = {
            "brassware": ["dhokra brass", "brass idol"],
            "saree": ["chanderi silk saree", "banarasi silk saree"],
            "pottery": ["jaipur blue pottery", "terracotta vase"],
            "jewelry": ["silver gemstone ring", "filigree jewelry"]
        }
        records = []
        for cat, keywords in categories.items():
            for kw in keywords:
                try:
                    comps = self.comp_matcher.fetch_live_comps(kw, num_results=15)
                    for comp in comps:
                        price = comp["price"]
                        mat_cost = round(price * 0.25, 2)
                        labor_hrs = round(max(0.5, (price * 0.50) / DEFAULT_TARGET_HOURLY_WAGE), 1)
                        cost_flr = round((mat_cost + labor_hrs * DEFAULT_TARGET_HOURLY_WAGE) / (1.0 - DEFAULT_PLATFORM_FEE_PCT), 2)

                        records.append({
                            "category": cat,
                            "material": kw.split()[0],
                            "technique": kw.split()[-1],
                            "size": "medium",
                            "labor_hours": labor_hrs,
                            "materials_cost": mat_cost,
                            "seller_rating": comp.get("rating", 4.5),
                            "review_count": 25,
                            "log_review_count": np.log1p(25),
                            "cost_floor": cost_flr,
                            "log_cost_floor": np.log1p(cost_flr),
                            "price": price
                        })
                except Exception as e:
                    print(f"[LiveDataCollector Warning] Live query '{kw}' skipped: {e}")

        if not records:
            raise RuntimeError("[ArtisanPricePredictor Error] Failed to collect live training data from SerperAPI.")

        df = pd.DataFrame(records)
        print(f"[ArtisanPricePredictor] Successfully trained on {len(df)} REAL LIVE SerperAPI records.")
        return df
