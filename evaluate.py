"""
Evaluation & Benchmarking Suite for Indian Artisan Price Prediction Models
"""
import numpy as np
import pandas as pd
from typing import Dict, Any
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from model import CatBoostQuantileModel, SerperCompMatcher


class ModelEvaluator:
    """Evaluates pricing models using MAE, MAPE, SMAPE, RMSLE, R2 Score."""

    @staticmethod
    def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        y_true = np.maximum(1.0, y_true)
        y_pred = np.maximum(1.0, y_pred)

        mae = mean_absolute_error(y_true, y_pred)
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100.0
        smape = np.mean(2.0 * np.abs(y_pred - y_true) / (np.abs(y_true) + np.abs(y_pred))) * 100.0
        rmsle = np.sqrt(mean_squared_error(np.log1p(y_true), np.log1p(y_pred)))
        r2 = r2_score(y_true, y_pred)

        return {
            "MAE (₹)": round(float(mae), 2),
            "MAPE (%)": round(float(mape), 2),
            "SMAPE (%)": round(float(smape), 2),
            "RMSLE": round(float(rmsle), 4),
            "R2_Score": round(float(r2), 4)
        }

    def run_benchmark_on_live_data(self) -> pd.DataFrame:
        matcher = SerperCompMatcher()
        raw_comps = matcher.fetch_live_comps("dhokra brass", num_results=20)
        df_live = pd.DataFrame([
            {
                "category": "brassware",
                "material": "brass",
                "technique": "dhokra",
                "size": "medium",
                "labor_hours": 4.0,
                "materials_cost": c["price"] * 0.25,
                "seller_rating": 4.5,
                "review_count": 25,
                "log_review_count": np.log1p(25),
                "cost_floor": (c["price"] * 0.25 + 4.0 * 250.0) / 0.85,
                "log_cost_floor": np.log1p((c["price"] * 0.25 + 4.0 * 250.0) / 0.85),
                "price": c["price"]
            } for c in raw_comps
        ])

        y_true = df_live["price"].values
        results = []
        for model_name in ["catboost", "lightgbm", "xgboost"]:
            try:
                m = CatBoostQuantileModel(model_type=model_name)
                m.fit(df_live, target_col="price")

                preds = []
                for _, row in df_live.iterrows():
                    pred_dict = m.predict(row.to_dict())
                    preds.append(pred_dict["median"])

                metrics = self.calculate_metrics(y_true, np.array(preds))
                metrics["Model"] = model_name.capitalize()
                results.append(metrics)
            except Exception as e:
                print(f"[Benchmark Warning] Model {model_name} failed: {e}")

        return pd.DataFrame(results)


if __name__ == "__main__":
    evaluator = ModelEvaluator()
    print("Running Model Comparison Benchmark on Live SerperAPI Data...")
    df_results = evaluator.run_benchmark_on_live_data()
    print("\nBenchmark Results:")
    print(df_results.to_string(index=False))
