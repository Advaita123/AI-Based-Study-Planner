# Import necessary libraries
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
import joblib

# Load the dataset
data = pd.read_csv('study_schedule_dataset.csv')

# Features and Target
X = data[['difficulty', 'marks', 'days_left']]
y = data['recommended_hours']

# Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Create and Train the model
model = DecisionTreeRegressor()
model.fit(X_train, y_train)

# Test the model 
score = model.score(X_test, y_test)
print(f"Model Accuracy: {score*100:.2f}%")

# Save the trained model
joblib.dump(model, 'study_scheduler_model.pkl')
