#!/bin/bash

set -e

# Deployment script for telegram-web-chat
# Usage: ./scripts/deploy.sh [environment] [version]

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
NAMESPACE="telegram-chat"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Validate environment
case $ENVIRONMENT in
    development|staging|production)
        log "Deploying to $ENVIRONMENT environment"
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production"
        ;;
esac

# Check required tools
command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"
command -v docker >/dev/null 2>&1 || error "docker is required but not installed"

# Set environment-specific variables
case $ENVIRONMENT in
    development)
        REGISTRY="localhost:5000"
        DOMAIN="localhost"
        REPLICAS=1
        ;;
    staging)
        REGISTRY="ghcr.io/your-org"
        DOMAIN="staging.chat.example.com"
        REPLICAS=2
        ;;
    production)
        REGISTRY="ghcr.io/your-org"
        DOMAIN="chat.example.com"
        REPLICAS=3
        ;;
esac

log "Using registry: $REGISTRY"
log "Using domain: $DOMAIN"
log "Using replicas: $REPLICAS"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply base configurations
log "Applying base configurations..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# Apply secrets (only if they don't exist)
if ! kubectl get secret telegram-chat-secrets -n $NAMESPACE >/dev/null 2>&1; then
    log "Creating secrets..."
    kubectl apply -f k8s/secrets.yaml
else
    warn "Secrets already exist, skipping creation"
fi

# Deploy infrastructure services
log "Deploying infrastructure services..."
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/meilisearch.yaml
kubectl apply -f k8s/nats.yaml
kubectl apply -f k8s/clamav.yaml

# Wait for infrastructure to be ready
log "Waiting for infrastructure services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/redis -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/minio -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/meilisearch -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/nats -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/clamav -n $NAMESPACE

# Update image tags in deployment files
log "Updating image tags..."
sed -i.bak "s|telegram-chat/api:latest|$REGISTRY/telegram-chat/api:$VERSION|g" k8s/api.yaml
sed -i.bak "s|telegram-chat/web:latest|$REGISTRY/telegram-chat/web:$VERSION|g" k8s/web.yaml

# Update replica counts
sed -i.bak "s|replicas: [0-9]*|replicas: $REPLICAS|g" k8s/api.yaml
sed -i.bak "s|replicas: [0-9]*|replicas: $REPLICAS|g" k8s/web.yaml

# Deploy application services
log "Deploying application services..."
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml

# Apply network policies
log "Applying network policies..."
kubectl apply -f k8s/network-policies.yaml

# Apply ingress (only for staging and production)
if [[ $ENVIRONMENT != "development" ]]; then
    log "Applying ingress configuration..."
    # Update domain in ingress
    sed -i.bak "s|chat.example.com|$DOMAIN|g" k8s/ingress.yaml
    sed -i.bak "s|api.chat.example.com|api.$DOMAIN|g" k8s/ingress.yaml
    kubectl apply -f k8s/ingress.yaml
fi

# Wait for application deployments
log "Waiting for application services to be ready..."
kubectl rollout status deployment/api -n $NAMESPACE --timeout=600s
kubectl rollout status deployment/web -n $NAMESPACE --timeout=600s

# Run database migrations
log "Running database migrations..."
kubectl exec -n $NAMESPACE deployment/api -- npx prisma migrate deploy

# Health checks
log "Running health checks..."
sleep 30

if [[ $ENVIRONMENT == "development" ]]; then
    # Port forward for local testing
    kubectl port-forward -n $NAMESPACE service/api-service 3000:3000 &
    kubectl port-forward -n $NAMESPACE service/web-service 8080:80 &
    
    sleep 5
    
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        log "API health check passed"
    else
        error "API health check failed"
    fi
    
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        log "Web health check passed"
    else
        error "Web health check failed"
    fi
    
    # Kill port forwards
    pkill -f "kubectl port-forward" || true
else
    # Check external endpoints
    if curl -f https://api.$DOMAIN/health >/dev/null 2>&1; then
        log "API health check passed"
    else
        error "API health check failed"
    fi
    
    if curl -f https://$DOMAIN/health >/dev/null 2>&1; then
        log "Web health check passed"
    else
        error "Web health check failed"
    fi
fi

# Cleanup backup files
rm -f k8s/*.bak

log "Deployment to $ENVIRONMENT completed successfully!"
log "Application is available at: https://$DOMAIN"
log "API is available at: https://api.$DOMAIN"

# Show deployment status
log "Deployment status:"
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE