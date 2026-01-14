# Technical Setup Guide

Complete technical documentation for setting up and deploying the Electricity Market Game.

## 🔧 System Architecture

### Overview
The Electricity Market Game uses a modern web architecture:
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI + SQLAlchemy + SQLite
- **Communication**: REST API with real-time updates
- **Deployment**: Local development, cloud-ready

### Component Architecture
```
┌─────────────────┐    HTTP/JSON    ┌─────────────────┐
│   React Frontend │ ◄──────────────► │  FastAPI Backend │
│                 │                 │                 │
│ • User Interface│                 │ • Game Logic    │
│ • State Mgmt    │                 │ • Market Engine │
│ • Data Viz      │                 │ • Database ORM  │
│ • Real-time UI  │                 │ • API Endpoints │
└─────────────────┘                 └─────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  SQLite Database │
                                    │                 │
                                    │ • Game Sessions │
                                    │ • Users & Plants│
                                    │ • Bids & Results│
                                    │ • Market Data   │
                                    └─────────────────┘
```

## 📦 Installation Options

### Option 1: Quick Start (Recommended)

**Prerequisites:**
- Python 3.8+ with pip
- Node.js 18+ with npm
- 4GB RAM, 2GB storage

**Installation:**
```bash
# Clone repository
git clone https://github.com/yourusername/electricity-market-game.git
cd electricity-market-game

# Backend setup
cd backend
pip install -r requirements.txt
python startup.py --dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

**Verification:**
- Backend: http://localhost:8000/health
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

### Option 2: Docker Deployment

**Docker Compose Setup:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./electricity_market.db
    volumes:
      - ./data:/app/data

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    depends_on:
      - backend
```

**Commands:**
```bash
# Build and start
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

### Option 3: Production Deployment

**Backend (Python/FastAPI):**
```bash
# Install production dependencies
pip install fastapi uvicorn gunicorn sqlalchemy psycopg2-binary

# Production server
gunicorn -w 4 -k uvicorn.workers.UvicornWorker startup:app --bind 0.0.0.0:8000
```

**Frontend (React):**
```bash
# Build for production
npm run build

# Serve with nginx or static hosting
# Build output in: frontend/dist/
```

**Database (PostgreSQL for production):**
```python
# Update database URL in production
DATABASE_URL = "postgresql://user:password@localhost/electricity_market_game"
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```bash
# Database
DATABASE_URL=sqlite:///./electricity_market_yearly.db
# DATABASE_URL=postgresql://user:pass@localhost/dbname  # Production

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# Game Configuration
DEFAULT_CARBON_PRICE=50.0
DEFAULT_SIMULATION_YEARS=10
MAX_UTILITIES_PER_SESSION=8

# Security (add for production)
SECRET_KEY=your-secret-key-here
API_KEY_REQUIRED=False
```

**Frontend (.env):**
```bash
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=Electricity Market Game

# Development
VITE_DEBUG=true
VITE_MOCK_DATA=false

# Production
# VITE_API_URL=https://your-api-domain.com
# VITE_DEBUG=false
```

### Database Configuration

**SQLite (Development):**
```python
# Automatic setup, no configuration needed
SQLALCHEMY_DATABASE_URL = "sqlite:///./electricity_market_yearly.db"
```

**PostgreSQL (Production):**
```python
# Install: pip install psycopg2-binary
SQLALCHEMY_DATABASE_URL = "postgresql://username:password@localhost/electricity_market_game"

# Connection pooling
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True
)
```

**MySQL (Alternative):**
```python
# Install: pip install pymysql
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://username:password@localhost/electricity_market_game"
```

## 🚀 Deployment Scenarios

### Scenario 1: Single Classroom (Local Network)

**Setup:**
- One instructor computer runs both backend and frontend
- Students access via local network (http://instructor-ip:3000)
- SQLite database for simplicity
- 5-10 concurrent users supported

**Network Configuration:**
```bash
# Backend: Allow external connections
python startup.py --dev --host 0.0.0.0

# Frontend: Configure for network access
# Update vite.config.ts:
server: {
  host: '0.0.0.0',
  port: 3000
}
```

### Scenario 2: Multiple Classrooms (Cloud Deployment)

**Infrastructure:**
- Cloud server (AWS, GCP, Azure) with 4GB+ RAM
- PostgreSQL database for reliability
- Load balancer for multiple sessions
- 20-50 concurrent users supported

**Deployment Stack:**
```bash
# Server setup (Ubuntu 20.04+)
sudo apt update
sudo apt install python3.8 python3-pip nodejs npm postgresql

# Application deployment
git clone https://github.com/yourusername/electricity-market-game.git
cd electricity-market-game

# Backend
cd backend
pip3 install -r requirements.txt
gunicorn -w 4 -k uvicorn.workers.UvicornWorker startup:app --bind 0.0.0.0:8000

# Frontend
cd frontend
npm install
npm run build
# Serve with nginx or static hosting
```

### Scenario 3: Enterprise/University Deployment

**Infrastructure:**
- Kubernetes cluster or container orchestration
- Managed database service (RDS, Cloud SQL)
- CDN for frontend assets
- Auto-scaling for variable load
- 100+ concurrent users supported

**Kubernetes Example:**
```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: electricity-market-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: electricity-market-backend
  template:
    metadata:
      labels:
        app: electricity-market-backend
    spec:
      containers:
      - name: backend
        image: electricity-market-game/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
```

## 🔍 Monitoring and Maintenance

### Health Monitoring

**Backend Health Checks:**
```python
# Built-in health endpoint
GET /health

# Custom monitoring
import psutil
import time

def system_health():
    return {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
        "uptime": time.time() - start_time
    }
```

**Frontend Monitoring:**
```javascript
// Performance monitoring
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Performance:', entry.name, entry.duration);
  }
});
observer.observe({entryTypes: ['measure', 'navigation']});
```

### Database Maintenance

**SQLite Maintenance:**
```bash
# Backup database
cp electricity_market_yearly.db backup_$(date +%Y%m%d).db

# Vacuum database (optimize)
sqlite3 electricity_market_yearly.db "VACUUM;"

# Check integrity
sqlite3 electricity_market_yearly.db "PRAGMA integrity_check;"
```

**PostgreSQL Maintenance:**
```sql
-- Backup
pg_dump electricity_market_game > backup_$(date +%Y%m%d).sql

-- Analyze tables
ANALYZE;

-- Vacuum
VACUUM ANALYZE;

-- Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname='public';
```

### Log Management

**Backend Logging:**
```python
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('electricity_market.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)
```

**Frontend Error Tracking:**
```javascript
// Error boundary for React
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
    // Send to monitoring service in production
  }
}
```

## 🔒 Security Considerations

### Development Security
- **API Access**: Currently open, add authentication for production
- **Data Validation**: Input validation on all endpoints
- **SQL Injection**: Protected by SQLAlchemy ORM
- **XSS Protection**: React provides built-in protection

### Production Security

**API Security:**
```python
# Add API key authentication
from fastapi import Security, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_api_key(token: str = Security(security)):
    if token.credentials != "your-api-key":
        raise HTTPException(status_code=401, detail="Invalid API key")
    return token
```

**Database Security:**
```python
# Use environment variables for credentials
import os
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./electricity_market.db")

# Connection encryption for PostgreSQL
DATABASE_URL = "postgresql://user:pass@host/db?sslmode=require"
```

**Frontend Security:**
```javascript
// Environment-based API URLs
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Input sanitization
import DOMPurify from 'dompurify';
const cleanInput = DOMPurify.sanitize(userInput);
```

## 📊 Performance Optimization

### Backend Optimization

**Database Optimization:**
```python
# Add indexes for common queries
class DBPowerPlant(Base):
    __tablename__ = "power_plants"
    
    # Add indexes
    __table_args__ = (
        Index('idx_utility_session', 'utility_id', 'game_session_id'),
        Index('idx_plant_type', 'plant_type'),
        Index('idx_commissioning_year', 'commissioning_year'),
    )
```

**API Optimization:**
```python
# Response caching
from functools import lru_cache

@lru_cache(maxsize=128)
def get_plant_templates():
    return PLANT_TEMPLATES_DATA

# Async database operations
from sqlalchemy.ext.asyncio import AsyncSession

async def get_plants_async(session: AsyncSession, session_id: str):
    result = await session.execute(
        select(DBPowerPlant).where(DBPowerPlant.game_session_id == session_id)
    )
    return result.scalars().all()
```

### Frontend Optimization

**React Optimization:**
```javascript
// Memoization for expensive calculations
const portfolioMetrics = useMemo(() => {
  return calculatePortfolioMetrics(plants);
}, [plants]);

// Lazy loading for large components
const Analytics = lazy(() => import('./pages/Analytics'));

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';
```

**Bundle Optimization:**
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx']
        }
      }
    }
  }
});
```

## 🧪 Testing

### Backend Testing

**Unit Tests:**
```python
# test_market_engine.py
import pytest
from market_game_api import MarketEngine, YearlyBid

def test_market_clearing():
    bids = [
        YearlyBid(plant_id="plant1", off_peak_price=30.0, off_peak_quantity=100),
        YearlyBid(plant_id="plant2", off_peak_price=40.0, off_peak_quantity=200)
    ]
    
    result = MarketEngine.clear_period_market(
        bids, demand=250, period="off_peak"
    )
    
    assert result.clearing_price == 40.0
    assert result.cleared_quantity == 250
```

**Integration Tests:**
```python
# test_api.py
from fastapi.testclient import TestClient
from market_game_api import app

client = TestClient(app)

def test_create_game_session():
    response = client.post("/game-sessions", json={
        "name": "Test Session",
        "operator_id": "test_operator"
    })
    assert response.status_code == 200
    assert "id" in response.json()
```

### Frontend Testing

**Component Tests:**
```javascript
// Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

test('renders utility dashboard', () => {
  render(<Dashboard />);
  expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
});
```

**Integration Tests:**
```javascript
// api.test.ts
import ElectricityMarketAPI from './api/client';

test('health check returns status', async () => {
  const health = await ElectricityMarketAPI.healthCheck();
  expect(health.status).toBe('healthy');
});
```

### Load Testing

**Backend Load Testing:**
```python
# locustfile.py
from locust import HttpUser, task, between

class GameUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def get_dashboard(self):
        self.client.get("/game-sessions/sample_game_1/dashboard")
    
    @task
    def submit_bid(self):
        self.client.post("/game-sessions/sample_game_1/bids", json={
            "plant_id": "plant_1",
            "year": 2025,
            "off_peak_quantity": 100,
            "off_peak_price": 50.0
        }, params={"utility_id": "utility_1"})
```

**Run Load Tests:**
```bash
# Install locust
pip install locust

# Run load test
locust -f locustfile.py --host=http://localhost:8000
```

## 🔧 Troubleshooting

### Common Issues

**Backend Won't Start**
```bash
# Check Python version
python --version  # Should be 3.8+

# Check dependencies
pip list | grep fastapi

# Check port availability
lsof -i :8000  # Should be empty

# Check database permissions
ls -la *.db
```

**Frontend Build Errors**
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

**Database Issues**
```bash
# Reset database
rm electricity_market_yearly.db
python startup.py --dev

# Check database integrity
sqlite3 electricity_market_yearly.db ".schema"
```

**API Connection Problems**
```bash
# Test API directly
curl http://localhost:8000/health

# Check CORS settings
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:8000/health
```

### Performance Issues

**Slow API Responses**
- Check database query performance
- Add indexes for common queries
- Implement response caching
- Monitor memory usage

**Frontend Lag**
- Check browser developer tools for errors
- Monitor network requests and timing
- Optimize React component rendering
- Reduce bundle size

**Database Growth**
- Monitor database file size
- Implement data archiving for old sessions
- Add database cleanup routines
- Consider database optimization

### Error Logging

**Backend Error Tracking:**
```python
import logging
import traceback

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

**Frontend Error Tracking:**
```javascript
// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to monitoring service in production
});

// React error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('React error:', error, errorInfo);
  }
}
```

## 📈 Scaling Considerations

### Horizontal Scaling

**Backend Scaling:**
- Use multiple FastAPI instances behind load balancer
- Implement session affinity or stateless design
- Use Redis for shared caching
- Consider microservices architecture for large deployments

**Database Scaling:**
- Read replicas for analytics queries
- Connection pooling for multiple app instances
- Database sharding for very large deployments
- Consider NoSQL for specific use cases

**Frontend Scaling:**
- CDN for static assets
- Multiple frontend instances
- Client-side caching strategies
- Progressive web app features

### Vertical Scaling

**Resource Requirements by User Count:**
- **5 users**: 2GB RAM, 2 CPU cores
- **20 users**: 4GB RAM, 4 CPU cores
- **50 users**: 8GB RAM, 8 CPU cores
- **100+ users**: 16GB+ RAM, 16+ CPU cores

**Database Sizing:**
- **Small (5 users, 1 session)**: 50MB database
- **Medium (20 users, 5 sessions)**: 200MB database
- **Large (100 users, 20 sessions)**: 1GB+ database

## 🔄 Backup and Recovery

### Backup Strategy

**Database Backup:**
```bash
# SQLite backup
cp electricity_market_yearly.db "backup_$(date +%Y%m%d_%H%M%S).db"

# PostgreSQL backup
pg_dump electricity_market_game > "backup_$(date +%Y%m%d_%H%M%S).sql"

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
cp electricity_market_yearly.db "$BACKUP_DIR/backup_$DATE.db"
find $BACKUP_DIR -name "backup_*.db" -mtime +7 -delete  # Keep 7 days
```

**Application Backup:**
```bash
# Full application backup
tar -czf "app_backup_$(date +%Y%m%d).tar.gz" \
    --exclude=node_modules \
    --exclude=__pycache__ \
    --exclude=*.db \
    electricity-market-game/
```

### Recovery Procedures

**Database Recovery:**
```bash
# Restore SQLite
cp backup_20240115_143000.db electricity_market_yearly.db

# Restore PostgreSQL
psql electricity_market_game < backup_20240115_143000.sql
```

**Application Recovery:**
```bash
# Restore application
tar -xzf app_backup_20240115.tar.gz
cd electricity-market-game
# Reinstall dependencies and restart
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

**Daily (Automated):**
- Database backup
- Log rotation
- Health check monitoring
- Performance metrics collection

**Weekly (Manual):**
- Review error logs
- Check disk space usage
- Update dependencies if needed
- Test backup restoration

**Monthly (Planned):**
- Security updates
- Performance optimization
- Feature updates
- User feedback review

### Monitoring Setup

**System Monitoring:**
```python
# Simple monitoring script
import psutil
import requests
import time

def monitor_system():
    # Check API health
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        api_status = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        api_status = "down"
    
    # Check system resources
    cpu_percent = psutil.cpu_percent()
    memory_percent = psutil.virtual_memory().percent
    disk_percent = psutil.disk_usage('/').percent
    
    print(f"API: {api_status}, CPU: {cpu_percent}%, Memory: {memory_percent}%, Disk: {disk_percent}%")

# Run every minute
while True:
    monitor_system()
    time.sleep(60)
```

### Update Procedures

**Backend Updates:**
```bash
# Backup current version
cp -r backend backend_backup_$(date +%Y%m%d)

# Update code
git pull origin main

# Update dependencies
pip install -r requirements.txt

# Test before deploying
python -m pytest tests/

# Deploy
python startup.py --dev
```

**Frontend Updates:**
```bash
# Backup current build
cp -r frontend/dist frontend_backup_$(date +%Y%m%d)

# Update code
git pull origin main

# Update dependencies
npm install

# Build and test
npm run build
npm run preview

# Deploy
npm run dev  # or serve build files
```

---

## 🎯 Production Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Backup procedures tested
- [ ] Monitoring configured
- [ ] Documentation updated

### Deployment
- [ ] Database migrated
- [ ] Environment variables set
- [ ] SSL certificates configured
- [ ] Load balancer configured
- [ ] Health checks passing
- [ ] Monitoring active

### Post-Deployment
- [ ] Functionality verified
- [ ] Performance acceptable
- [ ] Error rates normal
- [ ] Backup working
- [ ] User access confirmed
- [ ] Support team notified

---

**Ready to deploy the Electricity Market Game? Follow this guide for a robust, scalable implementation!**