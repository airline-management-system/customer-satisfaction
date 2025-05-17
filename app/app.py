import csv
import os
import numpy as np
import json
import joblib
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from flask import Flask, request, jsonify, render_template_string, render_template, url_for

import random
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    roc_auc_score, cohen_kappa_score, confusion_matrix, roc_curve
)

# Render the plots without GUI
import matplotlib
matplotlib.use('Agg')

from matplotlib import pyplot as plt
import seaborn as sns

# Path to the CSV file where survey data will be stored
CSV_FILE = "test.csv"

# Initialize global variables for metrics
accuracy = 1 
precision = 1
recall = 1
f1 = 1
auc = 1 
kappa = 1

# Initialize global variables for IPA analysis
df_company = pd.DataFrame()
importance_mean = 0
performance_mean = 0

# Load the test dataset
test_dataset = pd.read_csv(CSV_FILE)

# Load pre-trained models and encoders
rf = joblib.load('../notebook/rf.joblib')  # Random Forest model
le = joblib.load('../notebook/le.joblib')  # Label Encoder
sc = joblib.load('../notebook/scaler.joblib')  # Standard Scaler

# Initialize Flask app
app = Flask(__name__)

# Route to render the survey form
@app.route('/survey')
def survey():
    return render_template_string(open("survey.html").read())

# Ensure the CSV file exists with headers
if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow([
            "id", "Gender", "Customer Type", "Age", "Type Of Travel", "Class",
            "Flight Distance", 'Inflight wifi service', 'Departure/Arrival time convenient',
            'Ease of Online booking', 'Gate location', 'Food and drink', 'Online boarding',
            'Seat comfort', 'Inflight entertainment', 'On-board service', 'Leg room service',
            'Baggage handling', 'Checkin service', 'Inflight service', 'Cleanliness'
        ])

# Route to handle survey submission
@app.route('/submit-survey', methods=['POST'])
def submit_survey():
    # Parse form data into a dictionary
    data = request.form.to_dict()

    # Add generated fields for customer type, flight distance, and delays
    data["customer_type"] = random.choice(["Loyal Customer", "Disloyal Customer"])
    data["flight_distance"] = random.randint(500, 2500)
    data["departure_delay"] = random.randint(0, 60)
    data["arrival_delay"] = random.randint(0, 60)

    print(data)

    # Prepare row data for the CSV
    row = [
        0,
        data.get("id"),
        data.get("gender"),
        data["customer_type"],
        data.get("age"),
        data.get("travelType"),
        data.get("class"),
        data["flight_distance"],
        data.get("wifi"),
        data.get("timeConvenient"),
        data.get("booking"),
        data.get("gateLocation"),
        data.get("foodDrink"),
        data.get("onlineBoarding"),
        data.get("seatComfort"),
        data.get("entertainment"),
        data.get("onboard"),
        data.get("legroom"),
        data.get("baggage"),
        data.get("checkin"),
        data.get("inflight"),
        data.get("Cleanliness"),
        data["departure_delay"],
        data["arrival_delay"],
        ''
    ]
    
    # Determine satisfaction based on a threshold
    row[-1] = "neutral or dissatisfied" if sum(map(int, row[8:-3])) < 60 else "satisfied"

    # Append the data to the CSV file
    try:
        with open(CSV_FILE, mode="a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(row)
        return jsonify({"message": "Survey submitted and saved successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route to render the results page
@app.route('/results')
def results_page():
    try:
        return render_template("index.html")  # Render the index.html file
    except FileNotFoundError: 
        return "Error: index.html not found in templates folder.", 404
    except Exception as e: 
        print(f"Error rendering template: {e}")
        return "Error rendering page.", 500

# Route to fetch results for the frontend
@app.route('/get-results', methods=['GET'])
def get_results():
    # Call the model function to calculate metrics and generate plots
    model()

    global df_company
    global accuracy
    global precision
    global recall
    global f1
    global auc 
    global kappa
    global importance_mean 
    global performance_mean

    # Prepare results and images for the frontend
    results = {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "auc": auc,
        "kappa": kappa,
    }

    images = {
        "Confusion Matrix": "static/images/confmatrix.png",
        "ROC Curve": "static/images/roccurve.png",
        "IPA": "static/images/ipa.png",
    }

    ipa = df_company.to_json(orient="records")

    means = {
        "importance_mean": importance_mean,
        "performance_mean": performance_mean,
    }

    # Return the data in JSON format
    return jsonify({"results": results, "ipa": ipa, "means": means, "images": images})

# Function to calculate metrics and generate plots
@app.route('/model')
def model():
    global accuracy, precision, recall, f1, auc, kappa

    # Preprocess the test dataset
    test = test_dataset.copy()
    test = test.drop(columns=['Unnamed: 0', 'id'])
    test['satisfaction'] = le.transform(test['satisfaction'])
    categorical = test.select_dtypes(include=['object']).columns
    test = pd.get_dummies(test, columns=categorical, drop_first=True)
    test.dropna(axis=0, inplace=True)
    numeric_columns = test.select_dtypes(include=['float64', 'int64']).columns.to_list()
    numeric_columns.remove('satisfaction')
    test[numeric_columns] = sc.transform(test[numeric_columns])
    y_test = test["satisfaction"]
    test = test.drop(columns=['satisfaction'])
    y_pred = rf.predict(test)
    y_proba = rf.predict_proba(test)[:, 1]

    # Calculate evaluation metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba)
    kappa = cohen_kappa_score(y_test, y_pred)

    # Generate confusion matrix plot
    conf_matrix = confusion_matrix(y_test, y_pred)
    plt.ioff()
    plt.figure(figsize=(6, 6))
    sns.heatmap(conf_matrix, annot=True, fmt="d", cmap="Blues", 
                xticklabels=['Neutral/Dissatisfied', 'Satisfied'], 
                yticklabels=['Neutral/Dissatisfied', 'Satisfied'])
    plt.title('Confusion Matrix', fontsize=16)
    plt.xlabel('Predicted', fontsize=14)
    plt.ylabel('Actual', fontsize=14)
    plt.savefig("static/images/confmatrix.png")

    # Generate ROC curve plot
    fpr, tpr, _ = roc_curve(y_pred, y_proba)
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, label=f"AUC = {auc:.2f}", color="darkorange")
    plt.plot([0, 1], [0, 1], linestyle="--", color="gray")
    plt.title('ROC Curve', fontsize=16)
    plt.xlabel('False Positive Rate', fontsize=14)
    plt.ylabel('True Positive Rate', fontsize=14)
    plt.legend(loc="lower right")
    plt.savefig("static/images/roccurve.png")

    # Perform IPA analysis
    columns_of_interest = test_dataset.iloc[:, 8:-3]
    attributes = columns_of_interest.columns.tolist()
    means = columns_of_interest.mean().round(2)

    with open('../config/ipa.json', 'r') as file:
        data = json.load(file)
        importance_list = data["company_2"]

    data_set = {
        "Attribute": attributes,
        "Importance": importance_list,
        "Performance": means.tolist(),
    }

    global df_company, importance_mean, performance_mean
    df_company = pd.DataFrame(data_set)
    importance_mean = df_company['Importance'].mean().round(2)
    performance_mean = df_company['Performance'].mean().round(2)

    # Generate IPA scatter plot
    plt.figure(figsize=(8, 8))
    plt.scatter(df_company['Performance'], df_company['Importance'], c='blue', s=100)
    for i, row in df_company.iterrows():
        plt.text(row['Performance'] + 0.1, row['Importance'] + 0.1, row['Attribute'], fontsize=10)
    plt.axhline(y=importance_mean, color='red', linestyle='--', label="Mean Importance")
    plt.axvline(x=performance_mean, color='red', linestyle='--', label="Mean Performance")
    plt.xlabel("Performance")
    plt.ylabel("Importance")
    plt.title("Importance-Performance Analysis (IPA)")
    plt.legend()
    plt.grid()
    plt.savefig("static/images/ipa.png")

    # Classify attributes into IPA quadrants
    df_company['Quadrant'] = df_company.apply(ipa_classify, axis=1)

# Function to classify attributes into IPA quadrants
def ipa_classify(row):
    global importance_mean, performance_mean
    if row['Importance'] > importance_mean and row['Performance'] < performance_mean:
        return "Concentrate Here"
    elif row['Importance'] > importance_mean and row['Performance'] > performance_mean:
        return "Good Work"
    elif row['Importance'] < importance_mean and row['Performance'] < performance_mean:
        return "Low Priority"
    else:
        return "Possible Overkill"