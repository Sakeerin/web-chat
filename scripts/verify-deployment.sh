#!/bin/bash

set -e

# Deployment verification script
# Usage: ./scripts/verify-deployment.sh [environment]

ENVIRONMENT=${1:-development}
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
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

fail() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if kubectl is available
command -v kubectl >/dev/null 2>&1 || { error "kubectl is required but not installed"; exit 1; }

log "Verifying deployment in $ENVIRONMENT environment..."

# Check namespace
if kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
    success "Namespace $NAMESPACE exists"
else
    fail "Namespace $NAMESPACE not found"
    exit 1
fi

# Check deployments
log "Checking deployments..."
DEPLOYMENTS=("postgres" "redis" "minio" "meilisearch" "nats" "clamav" "api" "web")

for deployment in "${DEPLOYMENTS[@]}"; do
    if kubectl get deployment $deployment -n $NAMESPACE >/dev/null 2>&1; then
        READY=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
        DESIRED=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.replicas}')
        
        if [[ "$READY" == "$DESIRED" ]]; then
            success "Deployment $deployment is ready ($READY/$DESIRED)"
        else
            fail "Deployment $deployment is not ready ($READY/$DESIRED)"
        fi
    else
        fail "Deployment $deployment not found"
    fi
done

# Check services
log "Checking services..."
SERVICES=("postgres-service" "redis-service" "minio-service" "meilisearch-service" "nats-service" "clamav-service" "api-service" "web-service")

for service in "${SERVICES[@]}"; do
    if kubectl get service $service -n $NAMESPACE >/dev/null 2>&1; then
        success "Service $service exists"
    else
        fail "Service $service not found"
    fi
done

# Check persistent volume claims
log "Checking persistent volume claims..."
PVCS=("postgres-pvc" "redis-pvc" "minio-pvc" "meilisearch-pvc" "clamav-pvc")

for pvc in "${PVCS[@]}"; do
    if kubectl get pvc $pvc -n $NAMESPACE >/dev/null 2>&1; then
        STATUS=$(kubectl get pvc $pvc -n $NAMESPACE -o jsonpath='{.status.phase}')
        if [[ "$STATUS" == "Bound" ]]; then
            success "PVC $pvc is bound"
        else
            fail "PVC $pvc is not bound (status: $STATUS)"
        fi
    else
        fail "PVC $pvc not found"
    fi
done

# Health checks
log "Performing health checks..."

# API health check
if kubectl get deployment api -n $NAMESPACE >/dev/null 2>&1; then
    API_POD=$(kubectl get pods -n $NAMESPACE -l app=api -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$API_POD" ]]; then
        if kubectl exec $API_POD -n $NAMESPACE -- curl -f http://localhost:3000/health >/dev/null 2>&1; then
            success "API health check passed"
        else
            fail "API health check failed"
        fi
    else
        fail "No API pod found"
    fi
fi

# Database connectivity check
if kubectl get deployment postgres -n $NAMESPACE >/dev/null 2>&1; then
    POSTGRES_POD=$(kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$POSTGRES_POD" ]]; then
        if kubectl exec $POSTGRES_POD -n $NAMESPACE -- pg_isready -U postgres >/dev/null 2>&1; then
            success "PostgreSQL is ready"
        else
            fail "PostgreSQL is not ready"
        fi
    else
        fail "No PostgreSQL pod found"
    fi
fi

# Redis connectivity check
if kubectl get deployment redis -n $NAMESPACE >/dev/null 2>&1; then
    REDIS_POD=$(kubectl get pods -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$REDIS_POD" ]]; then
        if kubectl exec $REDIS_POD -n $NAMESPACE -- redis-cli ping >/dev/null 2>&1; then
            success "Redis is ready"
        else
            fail "Redis is not ready"
        fi
    else
        fail "No Redis pod found"
    fi
fi

# Check ingress (for non-development environments)
if [[ $ENVIRONMENT != "development" ]]; then
    log "Checking ingress..."
    if kubectl get ingress telegram-chat-ingress -n $NAMESPACE >/dev/null 2>&1; then
        success "Ingress exists"
        
        # Check if ingress has IP
        INGRESS_IP=$(kubectl get ingress telegram-chat-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        if [[ -n "$INGRESS_IP" ]]; then
            success "Ingress has IP: $INGRESS_IP"
        else
            warn "Ingress IP not yet assigned"
        fi
    else
        fail "Ingress not found"
    fi
fi

# Check monitoring (for staging/production)
if [[ $ENVIRONMENT == "staging" || $ENVIRONMENT == "production" ]]; then
    log "Checking monitoring services..."
    
    MONITORING_SERVICES=("prometheus-service" "grafana-service" "alertmanager-service")
    for service in "${MONITORING_SERVICES[@]}"; do
        if kubectl get service $service -n $NAMESPACE >/dev/null 2>&1; then
            success "Monitoring service $service exists"
        else
            warn "Monitoring service $service not found"
        fi
    done
fi

# Resource usage check
log "Checking resource usage..."
kubectl top pods -n $NAMESPACE 2>/dev/null || warn "Metrics server not available"

# Recent events check
log "Checking recent events..."
ERROR_EVENTS=$(kubectl get events -n $NAMESPACE --field-selector type=Warning --no-headers 2>/dev/null | wc -l)
if [[ $ERROR_EVENTS -eq 0 ]]; then
    success "No warning events found"
else
    warn "$ERROR_EVENTS warning events found"
    kubectl get events -n $NAMESPACE --field-selector type=Warning --sort-by='.lastTimestamp' | tail -5
fi

log "Deployment verification completed!"

# Summary
echo -e "\n=== DEPLOYMENT SUMMARY ==="
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Timestamp: $(date)"

kubectl get pods -n $NAMESPACE -o wide