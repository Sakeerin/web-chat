# Kubernetes Deployment Guide

This directory contains Kubernetes manifests and deployment scripts for the Telegram Web Chat application.

## Architecture Overview

The application is deployed as a microservices architecture with the following components:

### Application Services
- **API Service**: NestJS backend with WebSocket support
- **Web Service**: React PWA frontend served by Nginx

### Infrastructure Services
- **PostgreSQL**: Primary database
- **Redis**: Caching and pub/sub
- **MinIO**: S3-compatible object storage
- **MeiliSearch**: Full-text search engine
- **NATS**: Message streaming
- **ClamAV**: Antivirus scanning

### Monitoring & Logging
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Alertmanager**: Alert management
- **Elasticsearch**: Log storage
- **Kibana**: Log visualization
- **Fluentd**: Log collection

## Prerequisites

1. **Kubernetes Cluster**: v1.25+
2. **kubectl**: Configured to access your cluster
3. **Docker**: For building images
4. **Storage Classes**: 
   - `fast-ssd` for databases and search
   - `standard` for general storage

## Quick Start

### 1. Build Images

```bash
# Build all images
./scripts/build-images.sh latest

# Build with custom registry
./scripts/build-images.sh v1.0.0 ghcr.io/your-org/telegram-chat
```

### 2. Deploy to Development

```bash
# Deploy everything
./scripts/k8s-deploy.sh development deploy

# Check status
./scripts/k8s-deploy.sh development status

# View logs
./scripts/k8s-deploy.sh development logs
```

### 3. Deploy to Staging/Production

```bash
# Deploy to staging
./scripts/k8s-deploy.sh staging deploy

# Deploy to production
./scripts/k8s-deploy.sh production deploy
```

## Manual Deployment

### 1. Create Namespace and Base Configuration

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
```

### 2. Deploy Infrastructure Services

```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/meilisearch.yaml
kubectl apply -f k8s/nats.yaml
kubectl apply -f k8s/clamav.yaml
```

### 3. Wait for Infrastructure

```bash
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n telegram-chat
kubectl wait --for=condition=available --timeout=300s deployment/redis -n telegram-chat
kubectl wait --for=condition=available --timeout=300s deployment/minio -n telegram-chat
kubectl wait --for=condition=available --timeout=300s deployment/meilisearch -n telegram-chat
kubectl wait --for=condition=available --timeout=300s deployment/nats -n telegram-chat
kubectl wait --for=condition=available --timeout=300s deployment/clamav -n telegram-chat
```

### 4. Deploy Application Services

```bash
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml
```

### 5. Apply Network Policies

```bash
kubectl apply -f k8s/network-policies.yaml
```

### 6. Deploy Ingress (Production/Staging)

```bash
kubectl apply -f k8s/ingress.yaml
```

### 7. Deploy Monitoring and Logging

```bash
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/logging.yaml
```

## Configuration

### Environment Variables

Update `k8s/configmap.yaml` and `k8s/secrets.yaml` with your environment-specific values:

#### ConfigMap (Non-sensitive)
- Database connection details
- Service endpoints
- Application settings
- Rate limiting configuration

#### Secrets (Sensitive)
- Database passwords
- JWT secrets
- API keys
- Encryption keys

### Storage Classes

Ensure your cluster has the required storage classes:

```bash
# Check available storage classes
kubectl get storageclass

# Example storage class for fast SSDs
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-ssd
  replication-type: none
```

### Ingress Configuration

Update `k8s/ingress.yaml` with your domain names:

```yaml
spec:
  tls:
  - hosts:
    - your-domain.com
    - api.your-domain.com
    secretName: telegram-chat-tls
  rules:
  - host: your-domain.com
    # ... rest of configuration
```

## Scaling

### Horizontal Pod Autoscaling

The API and Web services include HPA configurations:

```bash
# Check HPA status
kubectl get hpa -n telegram-chat

# Scale manually if needed
kubectl scale deployment api --replicas=5 -n telegram-chat
kubectl scale deployment web --replicas=5 -n telegram-chat
```

### Database Scaling

For production, consider:
- PostgreSQL read replicas
- Redis clustering
- MinIO distributed mode

## Monitoring

### Accessing Monitoring Services

```bash
# Port forward to access locally
kubectl port-forward -n telegram-chat service/grafana-service 3000:3000
kubectl port-forward -n telegram-chat service/prometheus-service 9090:9090
kubectl port-forward -n telegram-chat service/kibana-service 5601:5601
```

### Key Metrics to Monitor

- **API Response Time**: P95 < 200ms
- **Message Latency**: P50 < 150ms
- **WebSocket Connections**: Target 10,000+
- **Database Performance**: Query time, connections
- **Memory Usage**: < 80% of limits
- **CPU Usage**: < 70% of limits

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n telegram-chat

# Describe problematic pod
kubectl describe pod <pod-name> -n telegram-chat

# Check logs
kubectl logs <pod-name> -n telegram-chat
```

#### Database Connection Issues

```bash
# Check database pod
kubectl logs deployment/postgres -n telegram-chat

# Test connection from API pod
kubectl exec -it deployment/api -n telegram-chat -- npx prisma db pull
```

#### Storage Issues

```bash
# Check PVC status
kubectl get pvc -n telegram-chat

# Check storage class
kubectl get storageclass
```

### Health Checks

```bash
# Check API health
kubectl exec -it deployment/api -n telegram-chat -- curl localhost:3000/health

# Check all services
kubectl get endpoints -n telegram-chat
```

## Security

### Network Policies

Network policies are applied to restrict traffic between services:

```bash
# Check network policies
kubectl get networkpolicy -n telegram-chat

# Test connectivity
kubectl exec -it deployment/api -n telegram-chat -- nc -zv postgres-service 5432
```

### Secrets Management

```bash
# View secrets (base64 encoded)
kubectl get secret telegram-chat-secrets -n telegram-chat -o yaml

# Update secret
kubectl create secret generic telegram-chat-secrets \
  --from-literal=DATABASE_PASSWORD=newpassword \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
kubectl exec deployment/postgres -n telegram-chat -- pg_dump -U postgres telegram_chat > backup.sql

# Restore backup
kubectl exec -i deployment/postgres -n telegram-chat -- psql -U postgres telegram_chat < backup.sql
```

### Persistent Volume Backup

Follow your cloud provider's documentation for PV snapshots.

## Cleanup

### Remove Everything

```bash
# Using script
./scripts/k8s-deploy.sh production destroy

# Manual cleanup
kubectl delete namespace telegram-chat
```

### Remove Specific Components

```bash
# Remove monitoring
kubectl delete -f k8s/monitoring.yaml

# Remove application
kubectl delete -f k8s/api.yaml
kubectl delete -f k8s/web.yaml
```

## CI/CD Integration

The deployment integrates with GitHub Actions for automated deployments:

- **Development**: Auto-deploy on push to `develop` branch
- **Staging**: Auto-deploy on push to `develop` branch after tests pass
- **Production**: Auto-deploy on push to `main` branch with manual approval

See `.github/workflows/ci-cd.yml` for the complete pipeline configuration.