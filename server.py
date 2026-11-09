from flask import Flask, request, jsonify, send_from_directory, session
from pathlib import Path
from functools import wraps
from datetime import timedelta
from werkzeug.security import check_password_hash
import os
import pandas as pd
import numpy as np

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)
from sklearn.pipeline import Pipeline


# ==================================================
# 1. KONFIGURASI APLIKASI
# ==================================================

BASE = Path(_file_).resolve().parent
DATA = BASE / "dataset_pengaduan.csv"

app = Flask(_name_, static_folder=None)

# Rahasia aplikasi dan password admin diatur melalui hosting
app.secret_key = os.environ.get("FLASK_SECRET_KEY")

ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=os.environ.get(
        "COOKIE_SECURE", "true"
    ).lower() == "true",
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8)
)


# ==================================================
# 2. LOAD DATASET DAN MACHINE LEARNING
# ==================================================

def load_data():
    df = pd.read_csv(DATA).dropna()

    df["teks_laporan"] = (
        df["teks_laporan"].astype(str).str.strip()
    )

    df["kategori"] = (
        df["kategori"].astype(str).str.strip()
    )

    return df[df["teks_laporan"] != ""]


def make_model():
    return Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                lowercase=True,
                ngram_range=(1, 2),
                sublinear_tf=True
            )
        ),
        (
            "nb",
            MultinomialNB(alpha=0.5)
        )
    ])


df = load_data()

X_train, X_test, y_train, y_test = train_test_split(
    df["teks_laporan"],
    df["kategori"],
    test_size=0.25,
    random_state=42,
    stratify=df["kategori"]
)

evaluation_model = make_model()
evaluation_model.fit(X_train, y_train)

y_pred = evaluation_model.predict(X_test)

model = make_model()
model.fit(df["teks_laporan"], df["kategori"])


# ==================================================
# 3. MIDDLEWARE KEAMANAN ADMIN
# ==================================================

def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):

        if session.get("role") != "admin":
            return jsonify({
                "success": False,
                "error": "Akses ditolak. Login sebagai admin terlebih dahulu."
            }), 401

        return func(*args, **kwargs)

    return wrapper


# ==================================================
# 4. LOGIN MAHASISWA
# ==================================================

@app.post("/api/student/login")
def student_login():

    payload = request.get_json(silent=True) or {}

    nama = str(payload.get("nama", "")).strip()
    nim = str(payload.get("nim", "")).strip()

    if not nama or not nim:
        return jsonify({
            "success": False,
            "error": "Nama dan NIM wajib diisi."
        }), 400

    if len(nama) > 100 or len(nim) > 30:
        return jsonify({
            "success": False,
            "error": "Nama atau NIM terlalu panjang."
        }), 400

    # Login mahasiswa bebas, tanpa password
    session.clear()

    session["role"] = "mahasiswa"
    session["nama"] = nama
    session["nim"] = nim
    session.permanent = True

    return jsonify({
        "success": True,
        "role": "mahasiswa",
        "nama": nama,
        "nim": nim,
        "message": "Login mahasiswa berhasil."
    })


# ==================================================
# 5. LOGIN ADMIN
# ==================================================

@app.post("/api/admin/login")
def admin_login():

    payload = request.get_json(silent=True) or {}

    password = str(payload.get("password", ""))

    if not app.secret_key or not ADMIN_PASSWORD_HASH:
        return jsonify({
            "success": False,
            "error": "Konfigurasi keamanan admin belum tersedia."
        }), 503

    if not password:
        return jsonify({
            "success": False,
            "error": "Password wajib diisi."
        }), 400

    try:
        valid = check_password_hash(
            ADMIN_PASSWORD_HASH,
            password
        )
    except (ValueError, TypeError):
        valid = False

    if not valid:
        return jsonify({
            "success": False,
            "error": "Password admin salah."
        }), 401

    session.clear()

    session["role"] = "admin"
    session.permanent = True

    return jsonify({
        "success": True,
        "role": "admin",
        "message": "Login admin berhasil."
    })


# ==================================================
# 6. CEK STATUS LOGIN
# ==================================================

@app.get("/api/session")
def check_session():

    role = session.get("role")

    if role == "admin":
        return jsonify({
            "authenticated": True,
            "role": "admin"
        })

    if role == "mahasiswa":
        return jsonify({
            "authenticated": True,
            "role": "mahasiswa",
            "nama": session.get("nama"),
            "nim": session.get("nim")
        })

    return jsonify({
        "authenticated": False,
        "role": None
    })


# ==================================================
# 7. LOGOUT
# ==================================================

@app.post("/api/logout")
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logout berhasil."
    })


# ==================================================
# 8. HALAMAN UTAMA DAN FILE FRONTEND
# ==================================================

@app.get("/")
def home():
    return send_from_directory(BASE, "index.html")


@app.get("/<path:filename>")
def frontend_files(filename):

    # Hanya izinkan file frontend, bukan file backend/dataset
    allowed_extensions = {
        ".css", ".js", ".png", ".jpg", ".jpeg",
        ".svg", ".ico", ".webp", ".woff", ".woff2"
    }

    if Path(filename).suffix.lower() not in allowed_extensions:
        return jsonify({"error": "File tidak ditemukan."}), 404

    return send_from_directory(BASE, filename)


# ==================================================
# 9. API KESEHATAN SERVER
# ==================================================

@app.get("/api/health")
def health():

    return jsonify({
        "status": "ok",
        "algorithm": "Multinomial Naive Bayes",
        "dataset_rows": int(len(df)),
        "classes": sorted(
            df["kategori"].unique().tolist()
        )
    })


# ==================================================
# 10. API PREDIKSI PENGADUAN
# ==================================================

@app.post("/api/predict")
def predict():

    payload = request.get_json(silent=True) or {}

    text = str(payload.get("text", "")).strip()

    if len(text) < 5:
        return jsonify({
            "error": "Teks laporan terlalu pendek."
        }), 400

    probabilities = model.predict_proba([text])[0]

    best = int(np.argmax(probabilities))

    return jsonify({
        "kategori_prediksi": str(model.classes_[best]),
        "confidence": round(
            float(probabilities[best]), 4
        ),
        "probabilitas": {
            str(c): round(float(p), 4)
            for c, p in zip(
                model.classes_, probabilities
            )
        }
    })


# ==================================================
# 11. API EVALUASI MACHINE LEARNING
# ==================================================

@app.get("/api/evaluate")
def evaluate():

    report = classification_report(
        y_test,
        y_pred,
        output_dict=True,
        zero_division=0
    )

    labels = sorted(
        df["kategori"].unique().tolist()
    )

    matrix = confusion_matrix(
        y_test,
        y_pred,
        labels=labels
    ).tolist()

    return jsonify({
        "algorithm": "Multinomial Naive Bayes",
        "features": "TF-IDF unigram + bigram",
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "dataset_size": int(len(df)),
        "accuracy": round(
            float(accuracy_score(y_test, y_pred)), 4
        ),
        "macro_precision": round(
            float(report["macro avg"]["precision"]), 4
        ),
        "macro_recall": round(
            float(report["macro avg"]["recall"]), 4
        ),
        "macro_f1": round(
            float(report["macro avg"]["f1-score"]), 4
        ),
        "labels": labels,
        "confusion_matrix": matrix,
        "note": (
            "Dataset contoh buatan untuk demonstrasi akademik; "
            "evaluasi belum mewakili data nyata kampus."
        )
    })


# ==================================================
# 12. CONTOH API KHUSUS ADMIN
# ==================================================

@app.get("/api/admin/dashboard")
@admin_required
def admin_dashboard():

    return jsonify({
        "success": True,
        "role": "admin",
        "message": "Selamat datang di dashboard admin."
    })


# ==================================================
# 13. MENJALANKAN SERVER
# ==================================================

if _name_ == "_main_":

    port = int(os.environ.get("PORT", "5000"))

    print(f"Suara Kampus berjalan pada port {port}")
    print(f"Dataset: {len(df)} baris")
    print("Algoritma: Multinomial Naive Bayes")

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
