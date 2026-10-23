
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="CHRONICARE AI Service")

MODEL_PATH = Path(__file__).parent / "models" / "risk_model.pkl"
model = joblib.load(MODEL_PATH)


class HealthData(BaseModel):
    heart_rate: float = Field(gt=0, le=300)
    spo2: float = Field(gt=0, le=100)
    systolic_bp: float = Field(gt=0, le=300)
    weight: float = Field(gt=0, le=500)


@app.get("/")
def home():
    return {
        "message": "CHRONICARE AI Service is running",
        "model": "RandomForestClassifier",
        "status": "ready"
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict-risk")
def predict_risk(data: HealthData):
    features = [[
        data.heart_rate,
        data.spo2,
        data.systolic_bp,
        data.weight
    ]]

    risk_category = str(model.predict(features)[0])

    probabilities = model.predict_proba(features)[0]
    class_probabilities = dict(
        zip(model.classes_, probabilities)
    )

    risk_score = round(
        100 * (
            class_probabilities.get("Moderate", 0)
            + class_probabilities.get("High", 0)
        )
    )

    return {
        "risk_score": risk_score,
        "risk_category": risk_category,
        "model": "RandomForestClassifier",
        "clinical_validation": False
    }
