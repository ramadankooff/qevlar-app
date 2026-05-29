#!/bin/bash
# Deploy example.app to Google Cloud Run
# Usage: ./deploy.sh [project-id] [region]

set -e

PROJECT_ID="${1:-}"
REGION="${2:-us-central1}"
SERVICE_NAME="example-app"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./deploy.sh <project-id> [region]"
  echo "Example: ./deploy.sh my-gcp-project us-central1"
  exit 1
fi

echo "🚀 Deploying example.app to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Set project
gcloud config set project $PROJECT_ID

# Enable APIs
echo "📦 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# Deploy
echo "🔨 Building and deploying..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 100

# Get URL
URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format='value(status.url)')

echo ""
echo "✅ Deployment successful!"
echo "🌐 Your app is live at: $URL"
echo ""
echo "Next steps:"
echo "1. Open $URL in your browser"
echo "2. Toggle 'Demo mode' off in Settings"
echo "3. Enter an API URL and try it out!"
echo ""
echo "To view logs:"
echo "  gcloud run logs read $SERVICE_NAME --limit 50 --region $REGION"
