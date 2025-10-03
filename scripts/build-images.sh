#!/bin/bash

set -e

# Build script for Docker images
# Usage: ./scripts/build-images.sh [tag] [registry]

TAG=${1:-latest}
REGISTRY=${2:-telegram-chat}

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

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running"
fi

log "Building Docker images with tag: $TAG"
log "Using registry: $REGISTRY"

# Build API image
log "Building API image..."
docker build \
    -f apps/api/Dockerfile \
    -t $REGISTRY/api:$TAG \
    --target production \
    .

# Build Web image
log "Building Web image..."
docker build \
    -f apps/web/Dockerfile \
    -t $REGISTRY/web:$TAG \
    --target production \
    .

# Build combined image (optional)
log "Building combined image..."
docker build \
    -f Dockerfile \
    -t $REGISTRY/app:$TAG \
    .

# Tag images for different environments
if [[ $TAG == "latest" ]]; then
    log "Tagging images for environments..."
    
    # Development tags
    docker tag $REGISTRY/api:$TAG $REGISTRY/api:dev
    docker tag $REGISTRY/web:$TAG $REGISTRY/web:dev
    
    # Staging tags
    docker tag $REGISTRY/api:$TAG $REGISTRY/api:staging
    docker tag $REGISTRY/web:$TAG $REGISTRY/web:staging
fi

# Show built images
log "Built images:"
docker images | grep $REGISTRY

# Optional: Push to registry
if [[ -n $DOCKER_REGISTRY ]]; then
    log "Pushing images to registry..."
    docker push $REGISTRY/api:$TAG
    docker push $REGISTRY/web:$TAG
    
    if [[ $TAG == "latest" ]]; then
        docker push $REGISTRY/api:dev
        docker push $REGISTRY/web:dev
        docker push $REGISTRY/api:staging
        docker push $REGISTRY/web:staging
    fi
fi

log "Build completed successfully!"