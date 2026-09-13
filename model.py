
import os
import sys
import re
import requests
import json
import pickle
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import KFold, GroupKFold, train_test_split
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# System & Currency Defaults
CURRENCY_SYMBOL = "₹"
DEFAULT_TARGET_HOURLY_WAGE = 250.0   # ₹250 / hour for skilled Indian artisans
DEFAULT_MIN_PROFIT_MARGIN = 0.20     # 20% minimum profit margin above cost floor
DEFAULT_PLATFORM_FEE_PCT = 0.15      # 15% platform commission + gateway tax overhead

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


TFIDF_CORPUS = [
    "handmade brass dhokra craft India artisan lost wax casting",
    "terracotta pottery traditional Indian clay hand thrown",
    "silk saree banarasi chanderi handwoven fabric weave",
    "madhubani pattachitra painting folk art canvas handpainted",
    "silver jewelry filigree gemstone ring necklace pendant",
    "sandalwood carved statue figurine wooden sculpture idol",
    "leather bag handcrafted artisan purse wallet journal",
    "block print fabric ajrakh textile cotton natural dye",
    "bidriware metal craft Karnataka zinc silver inlay",
    "bamboo cane basket weaving handmade eco-friendly",
    "bronze idol lost wax casting deity temple",
    "chikankari embroidery lucknow cotton kurta hand stitched",
    "meenakari enamel jewelry Rajasthan gold plated",
    "tanjore painting gold leaf traditional art board",
    "jute handicraft eco friendly bag home decor",
    "copper utensil brassware Indian kitchen traditional",
    "wooden toy channapatna lacquer colorful handmade",
    "warli art tribal painting wall hanging",
    "kalamkari hand painted fabric cotton pen",
    "zardozi embroidery bridal wedding dress thread",
    "handcrafted artisan traditional Indian ethnic product",
    "handicraft decorative item gift home decor India",
    "rajasthani craft cultural heritage India handmade",
    "kashmiri shawl pashmina hand embroidery woven",
    "odisha patta chitra silk handicraft natural",
    "dokra brass figurine tribal Chhattisgarh Odisha",
    "blue pottery jaipur quartz floral hand painted",
    "kantha stitch embroidery Bengal cotton sari",
    "dhurrie rug handwoven cotton flat weave India",
    "kondapalli toy wood lacquer Andhra traditional craft",
]



class CostEngine:
    """Computes cost-based price grounding to ensure artisans never price below cost floor."""

    @staticmethod
    def calculate_cost_floor(
        materials_cost: float,
        labor_hours: float,
        hourly_wage: float = DEFAULT_TARGET_HOURLY_WAGE
    ) -> float:
        """Cost Floor (₹) = Materials + Hours * Hourly Wage"""
        base_cost = max(0.0, float(materials_cost)) + max(0.0, float(labor_hours)) * max(0.0, float(hourly_wage))
        return round(base_cost, 2)

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
        # Validate required fields
        if not item.get("title"):
            raise ValueError("[FeatureExtractor] Missing required field: title")
        if item.get("materials_cost") is None and item.get("material_cost") is None:
            raise ValueError("[FeatureExtractor] Missing required field: materials_cost (or material_cost)")
        if item.get("labor_hours") is None and item.get("labour_hours") is None:
            raise ValueError("[FeatureExtractor] Missing required field: labor_hours (or labour_hours)")

        title = item.get("title", "")
        text_feats = self.extract_text_features(
            title=title,
            description=item.get("description", "")
        )

        labor_hours = float(item.get("labor_hours", item.get("labour_hours", 2.0)))
        materials_cost = float(item.get("materials_cost", item.get("material_cost", 100.0)))
        seller_rating = float(item.get("seller_rating", 4.5))
        review_count = float(item.get("review_count", 15.0))

        category = item.get("category")
        if not category:
            category = text_feats["primary_material"] if text_feats["primary_material"] != "traditional_material" else "Handicrafts"

        base_cost = materials_cost + labor_hours * DEFAULT_TARGET_HOURLY_WAGE
        log_base_cost = float(np.log1p(base_cost))
        labor_ratio = float((labor_hours * DEFAULT_TARGET_HOURLY_WAGE) / (base_cost + 1e-5))

        return {
            "category": str(category).lower().strip(),
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
            "log_base_cost": log_base_cost,
            "labor_ratio": labor_ratio,
            "material_count": text_feats["material_count"],
            "technique_count": text_feats["technique_count"],
            "title_word_count": text_feats["title_word_count"]
        }


class SerperCompMatcher:
    """Fetches real live Google Shopping India listings via SerperAPI & TF-IDF similarity ranks them. No caching - always live."""

    def __init__(self, api_key: str = SERPER_API_KEY):
        self.api_key = api_key
        self.session = requests.Session()
        retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
        self.session.mount("https://", HTTPAdapter(max_retries=retries))
        
        # Pre-fit TF-IDF vectorizer on corpus for faster inference
        self.tfidf = TfidfVectorizer(stop_words="english", max_features=5000)
        self.tfidf.fit(TFIDF_CORPUS)

    def fetch_live_comps(self, query: str, num_results: int = 20) -> List[Dict[str, Any]]:
        """Live fetcher using SerperAPI - always fetches fresh data."""
        if not self.api_key or self.api_key == "your_serper_api_key_here":
            logger.warning("[SerperCompMatcher] No valid SERPER_API_KEY, returning empty comps")
            return []

        clean_query = f"handmade {query} India".strip()

        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}
        payload = {"q": clean_query, "gl": SERPER_COUNTRY_CODE, "hl": SERPER_LANGUAGE_CODE, "num": num_results}

        try:
            response = self.session.post(SERPER_API_URL, json=payload, headers=headers, timeout=20)
            if response.status_code != 200:
                logger.warning(f"[SerperAPI Error] HTTP {response.status_code}: {response.text}")
                return []

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
                logger.warning(f"[SerperCompMatcher] Live query '{clean_query}' yielded 0 valid items.")
                return []

            logger.info(f"[SerperAPI Live] Retrieved {len(comps)} real live market listings for '{clean_query}'.")
            return comps
        except Exception as e:
            logger.warning(f"[SerperCompMatcher Exception] Live fetch failed for '{clean_query}': {e}")
            return []

    def filter_and_aggregate(self, target_title: str, raw_comps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Filters comps using TF-IDF cosine similarity against target_title (uses pre-fitted vectorizer)."""
        if not raw_comps:
            logger.warning("[SerperCompMatcher] Empty comps list, returning default stats")
            return {
                "filtered_comps": [],
                "comp_count": 0,
                "median_price": 0.0,
                "p25_price": 0.0,
                "p75_price": 0.0
            }

        titles = [target_title] + [c["title"] for c in raw_comps]
        try:
            tfidf_matrix = self.tfidf.transform(titles)
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
            "median_price": float(round(np.median(prices), 2)) if prices else 0.0,
            "p25_price": float(round(np.percentile(prices, 25), 2)) if prices else 0.0,
            "p75_price": float(round(np.percentile(prices, 75), 2)) if prices else 0.0
        }

    @staticmethod
    def _parse_inr_price(price_str: Any) -> float:
        if isinstance(price_str, (int, float)):
            return float(price_str)
        try:
            # Remove thousands separators, then extract the FIRST valid decimal
            # token via regex to handle range strings like "₹1,250 – ₹1,500"
            # or strings with multiple decimal points.
            text = str(price_str).replace(",", "").strip()
            match = re.search(r'\d+\.?\d*', text)
            return float(match.group()) if match else 0.0
        except (ValueError, AttributeError):
            return 0.0


# Default XGBoost parameters (no external tuned params file)
TUNED_XGBOOST_PARAMS = {
    'objective': "reg:quantileerror",
    'verbosity': 0
}


class CatBoostQuantileModel:
    """Multi-Quantile CatBoost Regressor (P15, P50, P85) with log-normal bias correction trained on live market data."""

    def __init__(self, model_type: str = "catboost"):
        self.model_type = model_type.lower()
        self.quantiles = [0.15, 0.50, 0.85]
        self.models: Dict[float, Any] = {}
        self.is_trained = False
        self.log_bias_correction: float = 0.0
        self.categorical_cols = ["category", "material", "technique", "size"]
        self.numerical_cols = [
            "labor_hours", "materials_cost", "seller_rating",
            "review_count", "log_review_count", "cost_floor", "log_cost_floor",
            "log_base_cost", "labor_ratio"
        ]
        self.feature_columns = self.categorical_cols + self.numerical_cols

    def fit(self, df: pd.DataFrame, target_col: str = "price", val_split: float = 0.2, random_state: int = 42, val_df: pd.DataFrame = None):
        if df is None or len(df) == 0:
            raise ValueError("[CatBoostQuantileModel Error] Empty training dataset provided.")

        X = df.copy()
        base_cost = X["materials_cost"] + X["labor_hours"] * DEFAULT_TARGET_HOURLY_WAGE
        if "log_base_cost" not in X.columns:
            X["log_base_cost"] = np.log1p(base_cost)
        if "labor_ratio" not in X.columns:
            X["labor_ratio"] = (X["labor_hours"] * DEFAULT_TARGET_HOURLY_WAGE) / (base_cost + 1e-5)

        for col in self.feature_columns:
            if col not in X.columns:
                X[col] = 0.0 if col in self.numerical_cols else "unknown"

        X_feats = X[self.feature_columns].copy()
        y_log = np.log1p(df[target_col].values)

        self.preprocessor = ColumnTransformer(
            transformers=[
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), self.categorical_cols),
                ("num", "passthrough", self.numerical_cols)
            ]
        )
        X_trans = self.preprocessor.fit_transform(X_feats)

        # Use provided validation set or create split
        if val_df is not None and len(val_df) > 0:
            X_val_raw = val_df.copy()
            base_cost_val = X_val_raw["materials_cost"] + X_val_raw["labor_hours"] * DEFAULT_TARGET_HOURLY_WAGE
            if "log_base_cost" not in X_val_raw.columns:
                X_val_raw["log_base_cost"] = np.log1p(base_cost_val)
            if "labor_ratio" not in X_val_raw.columns:
                X_val_raw["labor_ratio"] = (X_val_raw["labor_hours"] * DEFAULT_TARGET_HOURLY_WAGE) / (base_cost_val + 1e-5)
            for col in self.feature_columns:
                if col not in X_val_raw.columns:
                    X_val_raw[col] = 0.0 if col in self.numerical_cols else "unknown"
            X_val_feats = X_val_raw[self.feature_columns].copy()
            X_val_trans = self.preprocessor.transform(X_val_feats)
            y_val = np.log1p(val_df[target_col].values)
            X_train_trans, y_train = X_trans, y_log
        else:
            from sklearn.model_selection import train_test_split
            X_train_trans, X_val_trans, y_train, y_val = train_test_split(
                X_trans, y_log, test_size=val_split, random_state=random_state
            )

        for alpha in self.quantiles:
            model = self._create_quantile_regressor(alpha)
            
            # Handle early stopping differently for each model type
            if self.model_type == "catboost":
                model.fit(
                    X_train_trans, y_train,
                    eval_set=(X_val_trans, y_val),
                    early_stopping_rounds=50,
                    verbose=50
                )
            elif self.model_type == "lightgbm":
                
                from lightgbm import early_stopping, log_evaluation
                model.fit(
                    X_train_trans, y_train,
                    eval_set=[(X_val_trans, y_val)],
                    callbacks=[early_stopping(stopping_rounds=50), log_evaluation(period=50)]
                )
            elif self.model_type == "xgboost":
                # XGBoost: early_stopping_rounds goes in constructor, not fit()
                model.set_params(early_stopping_rounds=50)
                model.fit(
                    X_train_trans, y_train,
                    eval_set=[(X_val_trans, y_val)],
                    verbose=50
                )
            else:
                # GradientBoostingRegressor doesn't support early stopping with eval_set
                # Use n_estimators from init and no validation monitoring
                model.fit(X_train_trans, y_train)
            
            self.models[alpha] = model

        # Calculate residual log-normal variance bias correction factor to prevent underprediction
        p50_preds_log = self.models[0.50].predict(X_trans)
        residuals_log = y_log - p50_preds_log
        log_var = float(np.var(residuals_log))
        self.log_bias_correction = float(0.5 * log_var)

      
        self.is_trained = True
        return self

    def _enforce_quantile_monotonicity(self, X_trans: np.ndarray):
        """Post-hoc isotonic regression to enforce P15 <= P50 <= P85."""
        from sklearn.isotonic import IsotonicRegression
        preds = {}
        for alpha in self.quantiles:
            preds[alpha] = self.models[alpha].predict(X_trans)

        # Ensure P15 <= P50 <= P85 for each sample
        for i in range(len(X_trans)):
            p15, p50, p85 = preds[0.15][i], preds[0.50][i], preds[0.85][i]
            if p15 > p50 or p50 > p85:
                # Apply isotonic regression on the three quantiles
                iso_reg = IsotonicRegression(increasing=True)
                y_iso = iso_reg.fit_transform([0, 1, 2], [p15, p50, p85])
                preds[0.15][i], preds[0.50][i], preds[0.85][i] = y_iso[0], y_iso[1], y_iso[2]

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
            # Apply log-normal bias correction to prevent underprediction
            corrected_pred_log = pred_log + (self.log_bias_correction if alpha == 0.50 else 0.0)
            predictions[name] = round(max(0.0, float(np.expm1(corrected_pred_log))), 2)

        # Enforce strict monotonicity: P15 (low) <= P50 (median) <= P85 (high).


        low, median, high = sorted([predictions["low"], predictions["median"], predictions["high"]])
        predictions["low"], predictions["median"], predictions["high"] = low, median, high
        return predictions

    def get_feature_importances(self) -> Dict[str, float]:
        """Extracts relative feature importances (normalized %) averaged across quantile models."""
        if not self.is_trained:
            return {}
        try:
            feature_names = self.preprocessor.get_feature_names_out()
            raw_importances = []
            for alpha in self.quantiles:
                m = self.models[alpha]
                if hasattr(m, "get_feature_importance"):
                    imp = m.get_feature_importance()
                elif hasattr(m, "feature_importances_"):
                    imp = m.feature_importances_
                else:
                    continue
                raw_importances.append(imp)

            if not raw_importances:
                return {}

            avg_imp = np.mean(raw_importances, axis=0)
            grouped: Dict[str, float] = {}
            for name, score in zip(feature_names, avg_imp):
                clean_name = name.split("__")[-1]
                matched_col = None
                for col in self.feature_columns:
                    if clean_name.startswith(col):
                        matched_col = col
                        break
                col_key = matched_col if matched_col else clean_name
                grouped[col_key] = grouped.get(col_key, 0.0) + float(score)

            total = sum(grouped.values())
            if total > 0:
                grouped = {k: round((v / total) * 100.0, 2) for k, v in grouped.items()}
            return dict(sorted(grouped.items(), key=lambda item: item[1], reverse=True))
        except Exception as e:
            logger.warning(f"[CatBoostQuantileModel] Feature importance extraction failed: {e}")
            return {}

    def save_model(self, path: str):
        """Persist trained model to disk."""
        with open(path, 'wb') as f:
            pickle.dump({
                'models': self.models,
                'preprocessor': self.preprocessor,
                'log_bias_correction': self.log_bias_correction,
                'feature_columns': self.feature_columns,
                'categorical_cols': self.categorical_cols,
                'numerical_cols': self.numerical_cols,
                'quantiles': self.quantiles,
                'is_trained': self.is_trained,
                'model_type': self.model_type
            }, f)
        print(f"[CatBoostQuantileModel] Model saved to {path}")

    @classmethod
    def load_model(cls, path: str, model_type: str = "catboost"):
        """Load trained model from disk."""
        with open(path, 'rb') as f:
            data = pickle.load(f)
        obj = cls(model_type=model_type)
        obj.__dict__.update(data)
        print(f"[CatBoostQuantileModel] Model loaded from {path}")
        return obj

    def _create_quantile_regressor(self, alpha: float):
        if self.model_type == "catboost":
            try:
                from catboost import CatBoostRegressor
                return CatBoostRegressor(loss_function=f"Quantile:alpha={alpha}", iterations=300, learning_rate=0.06, depth=6, verbose=0)
            except ImportError:
                self.model_type = "lightgbm"

        if self.model_type == "lightgbm":
            try:
                from lightgbm import LGBMRegressor
                return LGBMRegressor(objective="quantile", alpha=alpha, n_estimators=300, learning_rate=0.06, num_leaves=31, verbose=-1)
            except ImportError:
                self.model_type = "xgboost"

        if self.model_type == "xgboost":
            try:
                from xgboost import XGBRegressor
                params = TUNED_XGBOOST_PARAMS.copy()
                params['quantile_alpha'] = alpha
                return XGBRegressor(**params)
            except ImportError:
                logger.warning("[CatBoostQuantileModel] XGBoost is not installed; falling back to GradientBoosting.")
            except Exception as e:
                logger.warning(f"[CatBoostQuantileModel] XGBoost initialisation failed ({e}); falling back to GradientBoosting.")

        logger.warning("[CatBoostQuantileModel] Using sklearn GradientBoostingRegressor (no early stopping support).")
        from sklearn.ensemble import GradientBoostingRegressor
        return GradientBoostingRegressor(loss="quantile", alpha=alpha, n_estimators=200, learning_rate=0.06, max_depth=5)


class ArtisanPricePredictor:
    """Main Orchestrator blending live SerperAPI training, real-time live comp matching, and CatBoost Quantile predictions."""

    def __init__(self, serper_api_key: str = SERPER_API_KEY, model_type: str = "catboost", model_path: str = None):
        if not serper_api_key or serper_api_key == "your_serper_api_key_here":
            raise ValueError("[ArtisanPricePredictor Error] Valid SERPER_API_KEY required in .env file.")

        self.cost_engine = CostEngine()
        self.feature_extractor = FeatureExtractor()
        self.comp_matcher = SerperCompMatcher(api_key=serper_api_key)

        # Lazy initialization - try to load persisted model, otherwise create new
        if model_path and os.path.exists(model_path):
            self.model = CatBoostQuantileModel.load_model(model_path, model_type=model_type)
            self._model_trained = True
            logger.info(f"[ArtisanPricePredictor] Loaded persisted model from {model_path}")
        else:
            self.model = CatBoostQuantileModel(model_type=model_type)
            self._model_trained = False

        self._model_path = model_path

    def train(self, force_retrain: bool = False):
        """Explicitly train or retrain the model."""
        if self._model_trained and not force_retrain:
            logger.info("[ArtisanPricePredictor] Model already trained. Use force_retrain=True to retrain.")
            return self

        logger.info("[ArtisanPricePredictor] Scraping live training data from Google Shopping India via SerperAPI...")
        live_df = self._collect_live_training_dataset()
        # Pass validation set for early stopping
        val_df = getattr(self, '_val_df', None)
        self.model.fit(live_df, target_col="price", val_df=val_df)
        self._model_trained = True

        # Persist model if path provided
        if self._model_path:
            self.model.save_model(self._model_path)

        return self

    def _ensure_trained(self):
        """Ensure model is trained before prediction."""
        if not self._model_trained:
            self.train()

    def predict_fair_price(self, item_details: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_trained()

        materials_cost = float(item_details.get("materials_cost", 0.0))
        labor_hours = float(item_details.get("labor_hours", 1.0))
        hourly_wage = float(item_details.get("hourly_wage", DEFAULT_TARGET_HOURLY_WAGE))

        cost_floor = self.cost_engine.calculate_cost_floor(materials_cost, labor_hours, hourly_wage)
        features = self.feature_extractor.prepare_item_features(item_details, cost_floor=cost_floor)
        raw_model_preds = self.model.predict(features)

        title = item_details.get("title", f"Handmade {features['material']} {features['category']}")
        search_query = title if title else f"{features['material']} {features['category']} {features['technique']}".strip()
        raw_comps = self.comp_matcher.fetch_live_comps(search_query)
        comps_info = self.comp_matcher.filter_and_aggregate(title, raw_comps)

        comp_median = comps_info["median_price"]
        comp_p25 = comps_info["p25_price"]
        comp_p75 = comps_info["p75_price"]

        if comps_info["comp_count"] > 0:
            # Blend 50% ML model + 50% live market comps
            blended_low    = 0.50 * raw_model_preds["low"]    + 0.50 * comp_p25
            blended_median = 0.50 * raw_model_preds["median"] + 0.50 * comp_median
            blended_high   = 0.50 * raw_model_preds["high"]   + 0.50 * comp_p75
        else:
            # No live comps available (API quota, network error, etc.).
            # Fall back to 100% ML model — blending with 0.0 would silently halve prices.
            logger.warning("[ArtisanPricePredictor] No live comp data returned; using 100% ML model predictions.")
            blended_low    = raw_model_preds["low"]
            blended_median = raw_model_preds["median"]
            blended_high   = raw_model_preds["high"]

        final_result = self.cost_engine.apply_safety_envelope(blended_low, blended_median, blended_high, cost_floor)

        result = {
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
                "comp_median_formatted": CostEngine.format_inr(comp_median)
            },
            "recommended_price_range_formatted": final_result["price_range_formatted"],
            "safety_envelope_applied": final_result["is_cost_adjusted"]
        }
        
        return result

    def _collect_live_training_dataset(self) -> pd.DataFrame:
        categories = {
            "brassware": ["dhokra brass", "brass idol", "bastar brass", "moradabad brass"],
            "saree": ["chanderi silk saree", "banarasi silk saree", "maheshwari silk", "kota doria saree"],
            "pottery": ["jaipur blue pottery", "terracotta vase", "khurja pottery", "black pottery"],
            "jewelry": ["silver gemstone ring", "filigree jewelry", "kundan jewelry", "meenakari jewelry"],
            "woodwork": ["sandalwood carving", "rosewood furniture", "sheesham wood", "channapatna toys"],
            "leather": ["leather bag", "leather journal", "mojari shoes", "leather pouch"],
            "painting": ["madhubani painting", "pattachitra painting", "warli art", "minature painting"],
            "textile": ["block print fabric", "ajrakh print", "bandhani tie dye", "ikkat fabric"],
            "metalcraft": ["bidriware", "bell metal", "copper utensils", "brass lamps"],
            "basketry": ["bamboo basket", "cane furniture", "moonj grass basket", "sikki grass craft"],
        }
        
        category_cost_ratios = {
            "brassware": {"material_pct": (0.30, 0.45), "labor_pct": (0.25, 0.40)},
            "saree": {"material_pct": (0.20, 0.35), "labor_pct": (0.40, 0.60)},
            "pottery": {"material_pct": (0.15, 0.25), "labor_pct": (0.50, 0.70)},
            "jewelry": {"material_pct": (0.40, 0.60), "labor_pct": (0.20, 0.35)},
            "woodwork": {"material_pct": (0.25, 0.40), "labor_pct": (0.35, 0.55)},
            "leather": {"material_pct": (0.35, 0.50), "labor_pct": (0.30, 0.45)},
            "painting": {"material_pct": (0.10, 0.20), "labor_pct": (0.60, 0.80)},
            "textile": {"material_pct": (0.20, 0.35), "labor_pct": (0.40, 0.60)},
            "metalcraft": {"material_pct": (0.30, 0.45), "labor_pct": (0.30, 0.45)},
            "basketry": {"material_pct": (0.15, 0.25), "labor_pct": (0.50, 0.70)},
        }
        
        records = []
        for cat, keywords in categories.items():
            for kw in keywords:
                try:
                    comps = self.comp_matcher.fetch_live_comps(kw, num_results=20)
                    for comp in comps:
                        price = comp["price"]
                        ratios = category_cost_ratios.get(cat, {"material_pct": (0.2, 0.4), "labor_pct": (0.3, 0.5)})
                        mat_pct = np.random.uniform(*ratios["material_pct"])
                        lab_pct = np.random.uniform(*ratios["labor_pct"])
                        mat_cost = round(price * mat_pct, 2)
                        labor_hrs = round(max(0.5, (price * lab_pct) / DEFAULT_TARGET_HOURLY_WAGE), 1)

                        records.append({
                            "category": cat,
                            "material": kw.split()[0],
                            "technique": kw.split()[-1],
                            "size": "medium",
                            "labor_hours": labor_hrs,
                            "materials_cost": mat_cost,
                            "seller_rating": comp.get("rating", 4.5),
                            "review_count": comp.get("review_count", np.random.randint(5, 200)),
                            "log_review_count": 0.0,
                            "cost_floor": round(mat_cost + labor_hrs * DEFAULT_TARGET_HOURLY_WAGE, 2),
                            "log_cost_floor": 0.0,
                            "price": price
                        })
                except Exception as e:
                    logger.warning(f"[LiveDataCollector Warning] Live query '{kw}' skipped: {e}")

        if not records:
            raise RuntimeError("[ArtisanPricePredictor Error] Failed to collect live training data from SerperAPI.")

        df = pd.DataFrame(records)
        df["log_review_count"] = np.log1p(df["review_count"])
        df["log_cost_floor"] = np.log1p(df["cost_floor"])
        
        # Train/validation split
        train_df, val_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['category'])
        
        # Store validation set for early stopping
        self._val_df = val_df
        
        logger.info(f"[ArtisanPricePredictor] Collected {len(df)} live records: {len(train_df)} train, {len(val_df)} val")
        return train_df


class ModelEvaluator:
    """Evaluation Suite for Artisan Price ML Models with comprehensive metrics."""

    @staticmethod
    def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Calculates comprehensive evaluation metrics on predictions."""
        y_true = np.maximum(1.0, y_true)
        y_pred = np.maximum(1.0, y_pred)

        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mae = mean_absolute_error(y_true, y_pred)
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100.0
        r2 = r2_score(y_true, y_pred)
        msle = np.mean((np.log1p(y_true) - np.log1p(y_pred)) ** 2)

        return {
            "RMSE (₹)": round(float(rmse), 2),
            "MAE (₹)": round(float(mae), 2),
            "MAPE (%)": round(float(mape), 2),
            "R²": round(float(r2), 4),
            "MSLE": round(float(msle), 4)
        }

    @staticmethod
    def calculate_quantile_metrics(y_true: np.ndarray, y_pred_low: np.ndarray, y_pred_median: np.ndarray, y_pred_high: np.ndarray) -> Dict[str, float]:
        """Calculates quantile-specific metrics: coverage, interval width, pinball loss."""
        y_true = np.maximum(1.0, y_true)
        y_pred_low = np.maximum(1.0, y_pred_low)
        y_pred_median = np.maximum(1.0, y_pred_median)
        y_pred_high = np.maximum(1.0, y_pred_high)

        coverage_80 = np.mean((y_true >= y_pred_low) & (y_true <= y_pred_high)) * 100
        coverage_50 = np.mean((y_true >= y_pred_low) & (y_true <= y_pred_median)) * 100 + \
                      np.mean((y_true >= y_pred_median) & (y_true <= y_pred_high)) * 100
        
        avg_interval_width = np.mean(y_pred_high - y_pred_low)
        median_interval_width = np.median(y_pred_high - y_pred_low)

        def pinball_loss(y_true, y_pred, alpha):
            diff = y_true - y_pred
            return np.mean(np.maximum(alpha * diff, (alpha - 1) * diff))

        pinball_15 = pinball_loss(y_true, y_pred_low, 0.15)
        pinball_50 = pinball_loss(y_true, y_pred_median, 0.50)
        pinball_85 = pinball_loss(y_true, y_pred_high, 0.85)

        return {
            "Coverage_80%": round(float(coverage_80), 2),
            "Coverage_50%": round(float(coverage_50), 2),
            "Avg_Interval_Width (₹)": round(float(avg_interval_width), 2),
            "Median_Interval_Width (₹)": round(float(median_interval_width), 2),
            "Pinball_Loss_P15": round(float(pinball_15), 2),
            "Pinball_Loss_P50": round(float(pinball_50), 2),
            "Pinball_Loss_P85": round(float(pinball_85), 2)
        }

    @staticmethod
    def price_range_confusion_matrix(y_true: np.ndarray, y_pred_median: np.ndarray, bins: int = 5) -> Dict[str, Any]:
        """Generates confusion matrix for price range categories."""
        y_true = np.maximum(1.0, y_true)
        y_pred_median = np.maximum(1.0, y_pred_median)

        percentiles = np.percentile(y_true, np.linspace(0, 100, bins + 1))
        percentiles[0] = 0
        percentiles[-1] = np.inf

        true_bins = np.digitize(y_true, percentiles) - 1
        pred_bins = np.digitize(y_pred_median, percentiles) - 1

        true_bins = np.clip(true_bins, 0, bins - 1)
        pred_bins = np.clip(pred_bins, 0, bins - 1)

        cm = np.zeros((bins, bins), dtype=int)
        for t, p in zip(true_bins, pred_bins):
            cm[t, p] += 1

        bin_labels = [f"₹{int(percentiles[i]):,}-₹{int(percentiles[i+1]):,}" if i < bins - 1 else f"₹{int(percentiles[i]):,}+" for i in range(bins)]

        return {
            "confusion_matrix": cm.tolist(),
            "bin_labels": bin_labels,
            "accuracy": round(float(np.trace(cm) / np.sum(cm) * 100), 2) if np.sum(cm) > 0 else 0.0
        }

    def cross_validate_model(self, df: pd.DataFrame, model_type: str = "catboost", n_splits: int = 5) -> Dict[str, Any]:
        """Performs GroupKFold Cross-Validation by category to prevent data leakage."""
        if df is None or len(df) < n_splits:
            n_splits = max(2, len(df)) if df is not None and len(df) >= 2 else 1

        if n_splits <= 1:
            m = CatBoostQuantileModel(model_type=model_type)
            m.fit(df)
            y_true = df["price"].values
            preds = []
            for _, row in df.iterrows():
                p = m.predict(row.to_dict())
                preds.append(p)

            y_med = np.array([p["median"] for p in preds])
            y_low = np.array([p["low"] for p in preds])
            y_high = np.array([p["high"] for p in preds])
            res = self.calculate_metrics(y_true, y_med)
            res.update(self.calculate_quantile_metrics(y_true, y_low, y_med, y_high))
            res.update(self.price_range_confusion_matrix(y_true, y_med))
            res["Model"] = model_type.capitalize()
            res["K_Folds"] = 1
            return res

        # Use GroupKFold to prevent category leakage
        groups = df['category'].values if 'category' in df.columns else np.arange(len(df))
        gkf = GroupKFold(n_splits=n_splits)
        fold_metrics = []
        fold_quantile_metrics = []
        fold_confusion_matrices = []

        for train_idx, test_idx in gkf.split(df, groups=groups):
            train_df = df.iloc[train_idx].copy()
            test_df = df.iloc[test_idx].copy()

            m = CatBoostQuantileModel(model_type=model_type)
            m.fit(train_df)

            preds = []
            for _, row in test_df.iterrows():
                p = m.predict(row.to_dict())
                preds.append(p)

            y_true = test_df["price"].values
            y_med = np.array([p["median"] for p in preds])
            y_low = np.array([p["low"] for p in preds])
            y_high = np.array([p["high"] for p in preds])

            metrics = self.calculate_metrics(y_true, y_med)
            quantile_metrics = self.calculate_quantile_metrics(y_true, y_low, y_med, y_high)
            confusion = self.price_range_confusion_matrix(y_true, y_med)

            fold_metrics.append(metrics)
            fold_quantile_metrics.append(quantile_metrics)
            fold_confusion_matrices.append(confusion)

        avg_results: Dict[str, Any] = {"Model": model_type.capitalize(), "K_Folds": n_splits}
        metric_keys = ["RMSE (₹)", "MAE (₹)", "MAPE (%)", "R²", "MSLE"]
        for key in metric_keys:
            vals = [fm[key] for fm in fold_metrics if key in fm]
            avg_results[key] = round(float(np.mean(vals)), 2) if vals else 0.0

        qmetric_keys = ["Coverage_80%", "Coverage_50%", "Avg_Interval_Width (₹)", "Median_Interval_Width (₹)",
                        "Pinball_Loss_P15", "Pinball_Loss_P50", "Pinball_Loss_P85"]
        for key in qmetric_keys:
            vals = [fm[key] for fm in fold_quantile_metrics if key in fm]
            avg_results[key] = round(float(np.mean(vals)), 2) if vals else 0.0

        if fold_confusion_matrices:
            avg_cm = np.mean([np.array(cm["confusion_matrix"]) for cm in fold_confusion_matrices], axis=0)
            avg_results["confusion_matrix"] = np.round(avg_cm).astype(int).tolist()
            avg_results["confusion_matrix_labels"] = fold_confusion_matrices[0]["bin_labels"]
            avg_results["price_range_accuracy"] = round(float(np.mean([cm["accuracy"] for cm in fold_confusion_matrices])), 2)

        return avg_results

    def run_benchmark_on_live_data(self, df: pd.DataFrame = None, n_splits: int = 5) -> Dict[str, Any]:
        """Runs comparative benchmark evaluation across CatBoost, LightGBM, and XGBoost models using RMSE and MAPE."""
        if df is None or len(df) == 0:
            # Build a minimal stub so we can call _collect_live_training_dataset
            # without going through full ArtisanPricePredictor.__init__ (which
            # validates the API key and initialises models we don't need here).
            serper_key = os.getenv("SERPER_API_KEY", "")
            predictor_temp = ArtisanPricePredictor.__new__(ArtisanPricePredictor)
            predictor_temp.comp_matcher = SerperCompMatcher(api_key=serper_key)
            predictor_temp._val_df = None  # ensure attribute exists before method sets it
            df = predictor_temp._collect_live_training_dataset()

        models_to_test = ["catboost", "lightgbm", "xgboost", "gradient_boosting"]
        benchmark_results = []

        for model_name in models_to_test:
            try:
                cv_res = self.cross_validate_model(df=df, model_type=model_name, n_splits=n_splits)
                benchmark_results.append(cv_res)
            except Exception as e:
                print(f"[Benchmark Warning] Model evaluation for '{model_name}' failed: {e}")

        primary_model = CatBoostQuantileModel(model_type="catboost")
        primary_model.fit(df)
        feature_importances = primary_model.get_feature_importances()

        return {
            "total_samples": len(df),
            "k_folds": n_splits,
            "models_evaluated": len(benchmark_results),
            "benchmark_metrics": benchmark_results,
            "feature_importances": feature_importances
        }

