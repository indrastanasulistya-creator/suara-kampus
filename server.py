from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.pipeline import Pipeline
import numpy as np

BASE = Path(__file__).resolve().parent
DATA = BASE / "dataset_pengaduan.csv"
app = Flask(__name__, static_folder=str(BASE))

def load_data():
    df = pd.read_csv(DATA).dropna()
    df["teks_laporan"] = df["teks_laporan"].astype(str).str.strip()
    df["kategori"] = df["kategori"].astype(str).str.strip()
    return df[df["teks_laporan"] != ""]

def make_model():
    return Pipeline([
        ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), sublinear_tf=True)),
        ("nb", MultinomialNB(alpha=0.5))
    ])

df = load_data()
X_train, X_test, y_train, y_test = train_test_split(
    df["teks_laporan"], df["kategori"], test_size=0.25,
    random_state=42, stratify=df["kategori"]
)
evaluation_model = make_model()
evaluation_model.fit(X_train, y_train)
y_pred = evaluation_model.predict(X_test)
model = make_model()
model.fit(df["teks_laporan"], df["kategori"])

@app.get("/")
def home():
    return send_from_directory(BASE, "index.html")

@app.get("/<path:filename>")
def frontend_files(filename):
    return send_from_directory(BASE, filename)

@app.get("/api/health")
def health():
    return jsonify({"status":"ok", "algorithm":"Multinomial Naive Bayes",
                    "dataset_rows":int(len(df)), "classes":sorted(df["kategori"].unique().tolist())})

@app.post("/api/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()
    if len(text) < 5:
        return jsonify({"error":"Teks laporan terlalu pendek."}), 400
    probabilities = model.predict_proba([text])[0]
    best = int(np.argmax(probabilities))
    return jsonify({
        "kategori_prediksi": str(model.classes_[best]),
        "confidence": round(float(probabilities[best]), 4),
        "probabilitas": {str(c): round(float(p), 4) for c,p in zip(model.classes_, probabilities)}
    })

@app.get("/api/evaluate")
def evaluate():
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    labels = sorted(df["kategori"].unique().tolist())
    matrix = confusion_matrix(y_test, y_pred, labels=labels).tolist()
    return jsonify({
        "algorithm":"Multinomial Naive Bayes",
        "features":"TF-IDF unigram + bigram",
        "train_size":int(len(X_train)), "test_size":int(len(X_test)),
        "dataset_size":int(len(df)),
        "accuracy":round(float(accuracy_score(y_test,y_pred)),4),
        "macro_precision":round(float(report["macro avg"]["precision"]),4),
        "macro_recall":round(float(report["macro avg"]["recall"]),4),
        "macro_f1":round(float(report["macro avg"]["f1-score"]),4),
        "labels":labels, "confusion_matrix":matrix,
        "note":"Dataset contoh buatan untuk demonstrasi akademik; evaluasi belum mewakili data nyata kampus."
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    print(f"Suara Kampus berjalan pada port {port}")
    print(f"Dataset: {len(df)} baris | Algoritma: Multinomial Naive Bayes")
    app.run(host="0.0.0.0", port=port, debug=False)
