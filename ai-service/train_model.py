
import os
import joblib
import numpy as np

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


# Generate demonstration training data
np.random.seed(42)

samples = 2000

heart_rate = np.random.randint(45, 141, samples)
spo2 = np.random.randint(85, 101, samples)
systolic_bp = np.random.randint(80, 181, samples)
weight = np.random.uniform(40, 130, samples)

X = np.column_stack([
    heart_rate,
    spo2,
    systolic_bp,
    weight
])


# Demonstration labels based on predefined rules
risk_labels = []

for hr, oxygen, bp, wt in X:
    score = 0

    if hr < 60 or hr > 100:
        score += 25

    if bp < 90 or bp >= 140:
        score += 30

    if oxygen < 95:
        score += 30

    if score >= 60:
        risk_labels.append("High")
    elif score >= 30:
        risk_labels.append("Moderate")
    else:
        risk_labels.append("Low")


y = np.array(risk_labels)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    class_weight="balanced"
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)

print("Model training completed")
print("Test accuracy:", round(accuracy_score(y_test, predictions), 3))
print(classification_report(y_test, predictions, zero_division=0))

os.makedirs("models", exist_ok=True)

joblib.dump(model, "models/risk_model.pkl")

print("Model saved to models/risk_model.pkl")
