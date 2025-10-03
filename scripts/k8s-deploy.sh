#!/bin/bash

set -e

# Kubernetes deployment script
# Usage: ./scripts/k8s-deploy.sh [environment] [action]

ENVIRONMENT=${1:-development}
ACTION=${2:-deploy}
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
        log "Operating on $ENVIRONMENT environment"
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production"
        ;;
esac

# Validate action
case $ACTION in
    deploy|destroy|status|logs)
        log "Action: $ACTION"
        ;;
    *)
        error "Invalid action: $ACTION. Must be one of: deploy, destroy, status, logs"
        ;;
esac

# Check required tools
command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"

deploy() {
    log "Deploying to $ENVIRONMENT..."
    
    # Create namespace
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply configurations in order
    log "Applying base configurations..."
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    
    # Deploy infrastructure services
    log "Deploying infrastructure services..."
    kubectl apply -f k8s/postgres.yaml
    kubectl apply -f k8s/redis.yaml
    kubectl apply -f k8s/minio.yaml
    kubectl apply -f k8s/meilisearch.yaml
    kubectl apply -f k8s/nats.yaml
    kubectl apply -f k8s/clamav.yaml
    
    # Wait for infrastructure
    log "Waiting for infrastructure services..."
    kubectl wait --for=condition=available --timeout=300s deployment/postgres -n $NAMESPACE || warn "Postgres deployment timeout"
    kubectl wait --for=condition=available --timeout=300s deployment/redis -n $NAMESPACE || warn "Redis deployment timeout"
    kubectl wait --for=condition=available --timeout=300s deployment/minio -n $NAMESPACE || warn "MinIO deployment timeout"
    kubectl wait --for=condition=available --timeout=300s deployment/meilisearch -n $NAMESPACE || warn "MeiliSearch deployment timeout"
    kubectl wait --for=condition=available --timeout=300s deployment/nats -n $NAMESPACE || warn "NATS deployment timeout"
    kubectl wait --for=condition=available --timeout=300s deployment/clamav -n $NAMESPACE || warn "ClamAV deployment timeout"
    
    # Deploy application services
    log "Deploying application services..."
    kubectl apply -f k8s/api.yaml
    kubectl apply -f k8s/web.yaml
    
    # Apply network policies
    log "Applying network policies..."
    kubectl apply -f k8s/network-policies.yaml
    
    # Apply ingress for non-development environments
    if [[ $ENVIRONMENT != "development" ]]; then
        log "Applying ingress configuration..."
        kubectl apply -f k8s/ingress.yaml
    fi
    
    # Deploy monitoring and logging
    if [[ $ENVIRONMENT == "production" || $ENVIRONMENT == "staging" ]]; then
        log "Deploying monitoring and logging..."
        kubectl apply -f k8s/monitoring.yaml
        kubectl apply -f k8s/logging.yaml
    fi
    
    # Wait for application deployments
    log "Waiting for application services..."
    kubectl rollout status deployment/api -n $NAMESPACE --timeout=600s
    kubectl rollout status deployment/web -n $NAMESPACE --timeout=600s
    
    log "Deployment completed successfully!"
}

destroy() {
    log "Destroying $ENVIRONMENT deployment..."
    
    warn "This will delete all resources in namespace $NAMESPACE"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Aborted"
        exit 0
    fi
    
    # Delete all resources
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    
    log "Destruction completed"
}

status() {
    log "Checking status of $ENVIRONMENT deployment..."
    
    echo "=== Namespace ==="
    kubectl get namespace $NAMESPACE 2>/dev/null || echo "Namespace not found"
    
    echo -e "\n=== Pods ==="
    kubectl get pods -n $NAMESPACE 2>/dev/null || echo "No pods found"
    
    echo -e "\n=== Services ==="
    kubectl get services -n $NAMESPACE 2>/dev/null || echo "No services found"
    
    echo -e "\n=== Deployments ==="
    kubectl get deployments -n $NAMESPACE 2>/dev/null || echo "No deployments found"
    
    echo -e "\n=== Ingress ==="
    kubectl get ingress -n $NAMESPACE 2>/dev/null || echo "No ingress found"
    
    echo -e "\n=== PVCs ==="
    kubectl get pvc -n $NAMESPACE 2>/dev/null || echo "No PVCs found"
    
    echo -e "\n=== Events ==="
    kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' 2>/dev/null || echo "No events found"
}

logs() {
    log "Showing logs for $ENVIRONMENT deployment..."
    
    echo "=== API Logs ==="
    kubectl logs -n $NAMESPACE deployment/api --tail=50 2>/dev/null || echo "No API logs found"
    
    echo -e "\n=== Web Logs ==="
    kubectl logs -n $NAMESPACE deployment/web --tail=50 2>/dev/null || echo "No Web logs found"
    
    echo -e "\n=== Recent Events ==="
    kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' --field-selector type!=Normal 2>/dev/null || echo "No error events found"
}

# Execute action
case $ACTION in
    deploy)
        deploy
        ;;
    destroy)
        destroy
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
esac