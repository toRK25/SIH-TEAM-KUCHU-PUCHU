"""
FastAPI REST API & Developer Testing Suite for Indian Artisan Fair-Price ML Model (INR / ₹)
Provides OpenAPI / Swagger docs (/docs), REST endpoints (/api/predict), and Developer Test Console (/test).
"""

import os
import sys
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Import Consolidated ML Engine & Benchmarking Suite from model.py
from model import ArtisanPricePredictor, ModelEvaluator, CostEngine, DEFAULT_TARGET_HOURLY_WAGE

# Initialize FastAPI App
app = FastAPI(
    title="Indian Artisan Fair-Price ML API",
    description="Quantile Regression (CatBoost/LightGBM/XGBoost) + Cost Safety Grounding + Live SerperAPI Competitor Matcher API for Indian Handicrafts.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for cross-origin website integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Per CORS spec, credentials=True is incompatible with wildcard origins.
                              # Set allow_origins to a specific list if cookies/auth headers are needed.
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy Singleton Instance for ArtisanPricePredictor
PREDICTOR_INSTANCE: Optional[ArtisanPricePredictor] = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "trained_model.pkl")
DEFAULT_MODEL_TYPE = "xgboost"  # Best performing model (11.87% MAPE)

def get_predictor() -> ArtisanPricePredictor:
    global PREDICTOR_INSTANCE
    if PREDICTOR_INSTANCE is None:
        serper_key = os.getenv("SERPER_API_KEY", "")
        if not serper_key or serper_key == "your_serper_api_key_here":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SERPER_API_KEY missing or unconfigured in .env file."
            )
        try:
            # Use model_path for persistence - loads if exists, saves after training
            PREDICTOR_INSTANCE = ArtisanPricePredictor(serper_api_key=serper_key, model_type=DEFAULT_MODEL_TYPE, model_path=MODEL_PATH)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to initialize ML model engine: {str(e)}"
            )
    return PREDICTOR_INSTANCE


# Pydantic Schemas for Website API Integration
class ItemDetails(BaseModel):
    title: str = Field(..., description="Image or item title", json_schema_extra={"example": "Authentic Dhokra lost-wax casted brass peacock statue"})
    materials_cost: Optional[float] = Field(None, ge=0.0, description="Raw material cost in INR (₹)", json_schema_extra={"example": 350.0})
    material_cost: Optional[float] = Field(None, ge=0.0, description="Alias for materials_cost", json_schema_extra={"example": 350.0})
    labor_hours: Optional[float] = Field(None, gt=0.0, description="Total labor hours invested", json_schema_extra={"example": 5.0})
    labour_hours: Optional[float] = Field(None, gt=0.0, description="Alias for labor_hours", json_schema_extra={"example": 5.0})

class PredictRequest(BaseModel):
    title: Optional[str] = Field(None, description="Image or item title", json_schema_extra={"example": "Authentic Dhokra lost-wax casted brass peacock statue"})
    materials_cost: Optional[float] = Field(None, ge=0.0, description="Raw material cost in INR (₹)", json_schema_extra={"example": 350.0})
    material_cost: Optional[float] = Field(None, ge=0.0, description="Alias for materials_cost", json_schema_extra={"example": 350.0})
    labor_hours: Optional[float] = Field(None, gt=0.0, description="Total labor hours invested", json_schema_extra={"example": 5.0})
    labour_hours: Optional[float] = Field(None, gt=0.0, description="Alias for labor_hours", json_schema_extra={"example": 5.0})
    item_details: Optional[ItemDetails] = None


class BatchPredictRequest(BaseModel):
    items: List[PredictRequest] = Field(..., description="List of items to predict", min_length=1, max_length=50)


@app.get("/", response_class=HTMLResponse, tags=["UI"])
def serve_ui():
    """Serve the interactive prediction UI."""
    return FileResponse(os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html"))


@app.get("/health", tags=["Health"])
def health_check():
    """Returns status of API service and environment configurations."""
    serper_key = os.getenv("SERPER_API_KEY", "")
    key_configured = bool(serper_key and serper_key != "your_serper_api_key_here")
    model_exists = os.path.exists(MODEL_PATH)
    return {
        "status": "online",
        "serper_api_configured": key_configured,
        "model_loaded": PREDICTOR_INSTANCE is not None,
        "model_persisted": model_exists,
        "model_path": MODEL_PATH if model_exists else None,
        "docs_url": "/docs",
        "ui_url": "/"
    }


@app.get("/api/model/info", tags=["Model Info"])
def model_info():
    """Returns information about the loaded model."""
    predictor = get_predictor()
    model = predictor.model
    return {
        "model_type": model.model_type,
        "is_trained": model.is_trained,
        "quantiles": [0.15, 0.50, 0.85],
        "feature_columns": model.feature_columns,
        "categorical_cols": model.categorical_cols,
        "numerical_cols": model.numerical_cols,
        "log_bias_correction": model.log_bias_correction,
        "persisted_path": MODEL_PATH if os.path.exists(MODEL_PATH) else None
    }


@app.post("/api/predict", tags=["Artisan ML"])
def predict_fair_price(payload: PredictRequest):
    """
    Main Website REST Endpoint.
    Predicts fair-price ranges (P15 Low, P50 Median, P85 High) for Indian artisan products
    combining live Google Shopping India market data (SerperAPI), CatBoost Quantile Regressors,
    and a non-negotiable cost safety floor.
    Input parameters: title, materials_cost (or material_cost), labor_hours (or labour_hours).
    """
    predictor = get_predictor()

    title = payload.title
    mat_cost = payload.materials_cost if payload.materials_cost is not None else payload.material_cost
    lab_hrs = payload.labor_hours if payload.labor_hours is not None else payload.labour_hours

    if payload.item_details:
        det = payload.item_details
        if not title:
            title = det.title
        if mat_cost is None:
            mat_cost = det.materials_cost if det.materials_cost is not None else det.material_cost
        if lab_hrs is None:
            lab_hrs = det.labor_hours if det.labor_hours is not None else det.labour_hours

    if title is not None and mat_cost is not None and lab_hrs is not None:
        details = {
            "title": title,
            "materials_cost": float(mat_cost),
            "labor_hours": float(lab_hrs)
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Must provide 'title', 'materials_cost' (or 'material_cost'), and 'labor_hours' (or 'labour_hours')."
        )

    try:
        result = predictor.predict_fair_price(details)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@app.post("/api/predict/batch", tags=["Artisan ML"])
def predict_fair_price_batch(payload: BatchPredictRequest):
    """
    Batch prediction endpoint for multiple items.
    More efficient than calling /api/predict multiple times due to shared model loading and cached SerperAPI calls.
    """
    predictor = get_predictor()
    results = []

    for item_payload in payload.items:
        title = item_payload.title
        mat_cost = item_payload.materials_cost if item_payload.materials_cost is not None else item_payload.material_cost
        lab_hrs = item_payload.labor_hours if item_payload.labor_hours is not None else item_payload.labour_hours

        if item_payload.item_details:
            det = item_payload.item_details
            if not title:
                title = det.title
            if mat_cost is None:
                mat_cost = det.materials_cost if det.materials_cost is not None else det.material_cost
            if lab_hrs is None:
                lab_hrs = det.labor_hours if det.labor_hours is not None else det.labour_hours

        if title is not None and mat_cost is not None and lab_hrs is not None:
            details = {
                "title": title,
                "materials_cost": float(mat_cost),
                "labor_hours": float(lab_hrs)
            }
        else:
            results.append({
                "error": "Must provide 'title', 'materials_cost' (or 'material_cost'), and 'labor_hours' (or 'labour_hours').",
                "input": item_payload.model_dump()
            })
            continue

        try:
            result = predictor.predict_fair_price(details)
            result["input_title"] = title
            results.append(result)
        except Exception as e:
            results.append({
                "error": f"Prediction failed: {str(e)}",
                "input": item_payload.model_dump()
            })

    return {
        "status": "completed",
        "total": len(payload.items),
        "successful": len([r for r in results if "error" not in r]),
        "failed": len([r for r in results if "error" in r]),
        "results": results
    }


@app.get("/api/evaluate", tags=["Model Evaluation"])
def run_model_evaluation(k_folds: int = 5):
    """Runs live model benchmark evaluation across CatBoost, LightGBM, XGBoost, and GradientBoosting models with K-Fold cross validation."""
    try:
        evaluator = ModelEvaluator()
        report_data = evaluator.run_benchmark_on_live_data(df=None, n_splits=k_folds)
        return {
            "status": "success",
            "k_folds": k_folds,
            "total_samples": report_data.get("total_samples", 0),
            "models_evaluated": report_data.get("models_evaluated", 0),
            "benchmark_metrics": report_data.get("benchmark_metrics", []),
            "feature_importances": report_data.get("feature_importances", {})
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Benchmark execution failed: {str(e)}"
        )


@app.post("/api/model/train", tags=["Model Management"])
def train_model(force_retrain: bool = False):
    """Explicitly train or retrain the model. Use force_retrain=True to retrain an already trained model."""
    try:
        predictor = get_predictor()
        predictor.train(force_retrain=force_retrain)
        return {
            "status": "success",
            "message": "Model trained and persisted successfully",
            "model_path": MODEL_PATH
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )


if __name__ == "__main__":
    import argparse
    import json

    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Indian Artisan Fair-Price ML Model ")
    parser.add_argument("--title", type=str, default=None, help="Image title of the craft item")
    parser.add_argument("--materials_cost", "--material_cost", "--materials-cost", "--material-cost", type=float, default=None, help="Raw material cost in INR (₹)")
    parser.add_argument("--labor_hours", "--labour_hours", "--labor-hours", "--labour-hours", type=float, default=None, help="Total labor hours invested")
    parser.add_argument("--server", action="store_true", help="Start FastAPI web server on http://127.0.0.1:8000")
    parser.add_argument("--evaluate", action="store_true", help="Run ML model evaluation benchmark across algorithms")

    args = parser.parse_args()

    if args.evaluate:
        print("=" * 80)
        print("   INDIAN ARTISAN FAIR-PRICE ML MODEL EVALUATION (RMSE & MAPE)")
        print("=" * 80)
        print("[*] Running 5-Fold Cross-Validation Evaluation...")
        evaluator = ModelEvaluator()
        report_data = evaluator.run_benchmark_on_live_data(df=None, n_splits=5)
        
        print("\n" + "-" * 60)
        print(f"{'Model':<18} | {'K-Folds':<8} | {'RMSE (₹)':<12} | {'MAPE (%)':<10}")
        print("-" * 60)
        for row in report_data.get("benchmark_metrics", []):
            model_name = str(row.get("Model", "Unknown"))
            folds = str(row.get("K_Folds", 5))
            rmse = f"₹{row.get('RMSE (₹)', 0):,.2f}"
            mape = f"{row.get('MAPE (%)', 0):.2f}%"
            print(f"{model_name:<18} | {folds:<8} | {rmse:<12} | {mape:<10}")
        print("-" * 60)
        
        feat_imp = report_data.get("feature_importances", {})
        if feat_imp:
            print("\nFeature Importances (CatBoost):")
            for feat, score in feat_imp.items():
                print(f"  - {feat:<20}: {score:.2f}%")
        print("=" * 80)
    elif args.server:
        import uvicorn
        print("=" * 80)
        print("  LAUNCHING FASTAPI SERVICE FOR INDIAN ARTISAN FAIR-PRICE ML MODEL")
        print("  - REST Endpoint: POST http://127.0.0.1:8000/api/predict")
        print("  - Health Check:  GET  http://127.0.0.1:8000/health")
        print("  - OpenAPI Docs:  http://127.0.0.1:8000/docs")
        print("=" * 80)
        uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
    else:
        

        title = args.title
        if not title:
            title = input("Enter Image / Craft Title: ").strip()
            if not title:
                title = "Authentic Dhokra lost-wax casted brass peacock statue"

        mat_cost = args.materials_cost
        if mat_cost is None:
            raw_mat = input("Enter Raw Material Cost in ₹: ").strip()
            try:
                mat_cost = float(raw_mat) if raw_mat else 350.0
            except ValueError:
                print("Invalid cost entered, defaulting to ₹350.00")
                mat_cost = 350.0

        lab_hrs = args.labor_hours
        if lab_hrs is None:
            raw_hrs = input("Enter Labor Hours Invested: ").strip()
            try:
                lab_hrs = float(raw_hrs) if raw_hrs else 5.0
            except ValueError:
                print("Invalid hours entered, defaulting to 5.0 hours")
                lab_hrs = 5.0

        print("-" * 80)
        print(f"Input Title:          {title}")
        print(f"Raw Materials Cost:   ₹{mat_cost:.2f}")
        print(f"Labor Hours Invested: {lab_hrs} hours")
        print("-" * 80)

        try:
            predictor = get_predictor()
        except HTTPException as e:
            print(f"[Error] {e.detail}")
            print("Tip: Set SERPER_API_KEY in your .env file or as an environment variable.")
            sys.exit(1)
        input_data = {
            "title": title,
            "materials_cost": mat_cost,
            "labor_hours": lab_hrs
        }

        result = predictor.predict_fair_price(input_data)
        print("Prediction Result (JSON):")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("=" * 80)
        print("\nTip: Run with --server to launch the REST API server, or pass arguments e.g.:")
        print("  python app.py --title \"Chanderi Silk Saree\" --materials_cost 1800 --labor_hours 14")
        print("  curl -X POST http://127.0.0.1:8000/api/predict -H \"Content-Type: application/json\" -d '{\"title\": \"Dhokra Peacock\", \"materials_cost\": 350, \"labor_hours\": 5}'")

