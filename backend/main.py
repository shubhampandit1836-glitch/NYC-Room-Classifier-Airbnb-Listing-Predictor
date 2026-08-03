from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
import joblib
import pandas as pd
import os

# ── Paths ────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
MODELS_DIR   = os.path.join(BASE_DIR, "models")

app = FastAPI(
    title="NYC Airbnb Room Type Predictor",
    description="Predict whether a listing is Entire home/apt, Private room, or Shared room",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model ───────────────────────────────────────────
# Added fallback for development if Model_Pipeline.pkl is missing
try:
    pipeline = joblib.load(os.path.join(MODELS_DIR, "Model_Pipeline.pkl"))
except Exception as e:
    print(f"Warning: Model not found at {MODELS_DIR}. Error: {e}")
    pipeline = None

MODEL_INFO = {
    "type":      "Random Forest Classifier",
    "accuracy":  0.854,
    "macro_f1":  0.735,
    "classes":   ["Entire home/apt", "Private room", "Shared room"],
    "cv_folds":  3,
    "features":  10
}

# ── Schema ───────────────────────────────────────────────
class ListingData(BaseModel):
    neighbourhood_group: str
    neighbourhood: str
    latitude: float
    longitude: float
    price: float
    minimum_nights: int
    number_of_reviews: int
    reviews_per_month: float
    calculated_host_listings_count: int
    availability_365: int

# ── Frontend ─────────────────────────────────────────────
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/app")
def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

# ── Routes ───────────────────────────────────────────────
@app.get("/")
def home():
    return RedirectResponse(url="/app")

@app.get("/model-info")
def get_model_info():
    return MODEL_INFO

@app.post("/predict")
def predict(data: ListingData):
    if not pipeline:
        return {"error": "Model file not loaded. Please ensure Model_Pipeline.pkl is in the models directory."}

    df = pd.DataFrame([data.dict()])

    prediction    = pipeline.predict(df)[0]
    probabilities = pipeline.predict_proba(df)[0]
    classes       = pipeline.classes_

    proba_dict = {
        cls: round(float(prob), 4)
        for cls, prob in zip(classes, probabilities)
    }

    confidence = round(float(max(probabilities)) * 100, 1)

    # Insight based on prediction
    insights = {
        "Entire home/apt": "This listing profile matches whole-unit rentals — typically higher price, fewer reviews, and lower availability.",
        "Private room":    "This listing profile matches private room rentals — moderate price, good review frequency, multi-listing hosts.",
        "Shared room":     "This listing profile matches shared accommodations — typically budget-friendly with flexible availability.",
    }

    return {
        "prediction":    prediction,
        "confidence":    confidence,
        "probabilities": proba_dict,
        "insight":       insights.get(prediction, "No insight available."),
        "model_accuracy": MODEL_INFO["accuracy"],
        "model_f1":       MODEL_INFO["macro_f1"]
    }

if __name__ == "__main__":
    import uvicorn
    # 0.0.0.0 binds to all IPs, satisfying Render and Localhost requirements
    uvicorn.run(app, host="0.0.0.0", port=8000)