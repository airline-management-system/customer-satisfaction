import csv
import os

from flask import Flask, request, jsonify, render_template_string
import random


CSV_FILE = "train.csv"

app = Flask(__name__)

@app.route('/')
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

@app.route('/submit-survey', methods=['POST'])
def submit_survey():
    data = request.form.to_dict()

    # Add generated fields
    data["customer_type"] = random.choice(["Loyal Customer", "Disloyal Customer"])
    data["flight_distance"] = random.randint(500, 2500)
    data["departure_delay"] = random.randint(0, 60)
    data["arrival_delay"] = random.randint(0, 60)

    print(data)

    # Prepare row data for the CSV
    row = [
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
        data["arrival_delay"]
    ]

    # Append the data to the CSV
    try:
        with open(CSV_FILE, mode="a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(row)
        return jsonify({"message": "Survey submitted and saved successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
