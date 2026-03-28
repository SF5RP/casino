# Casino Roulette - Full Stack Application

🎰 Complete casino roulette application with Next.js frontend and high-performance Go backend.

## 🏗️ Architecture

```
casino/
├── 🎨 frontend/              # Next.js React application
├── ⚡ backend/               # Go server with PostgreSQL
└── 📄 README.md              # Project overview
```

## ✨ Features

### Frontend (Next.js 15)
- 🎯 **Real-time Roulette Board** - Live number tracking and statistics
- 📊 **Advanced Analytics** - Color, sector, and pattern analysis
- 🔮 **Forecast System** - Predictive algorithms for next numbers
- 📱 **Responsive Design** - Mobile-first approach
- ⚡ **SSR Support** - Server-side rendering for performance
- 🎨 **Modern UI** - Emotion-based styling system

### Backend (Go)
- 🚀 **High Performance** - 50,000+ requests/second
- 🗄️ **PostgreSQL** - Reliable data persistence with fallback
- 🔄 **Built-in Migrations** - Database schema management
- 🌐 **WebSocket** - Real-time bi-directional communication
- 📊 **REST API** - Complete HTTP API
- 🛡️ **Health Monitoring** - Comprehensive system checks

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Go** 1.22+ (for backend)
- **PostgreSQL** (optional - auto-fallback to in-memory)

### 1. Clone Repository
```bash
git clone https://github.com/SF5RP/casino.git
cd casino
```

### 2. Start Backend
```bash
cd backend
go mod tidy
go build -o casino-backend ./cmd/server
./casino-backend
```

### 3. Start Frontend
```bash
# In new terminal
cd frontend
npm install
npm run dev
```

### 4. Open Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

## 📁 Project Structure

```
casino/
├── frontend/                # Next.js Frontend
│   ├── src/                 # Source code
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   │   └── casino/      # Roulette-specific components
│   │   ├── lib/             # Utilities and API clients
│   │   └── config/          # Configuration files
│   ├── package.json         # Frontend dependencies
│   ├── next.config.ts       # Next.js configuration
│   └── README.md           # Frontend documentation
├── backend/                 # Go Backend
│   ├── cmd/server/          # Application entry point
│   ├── internal/            # Internal packages
│   │   ├── database/        # Database layer + migrations
│   │   ├── handlers/        # HTTP handlers
│   │   └── models/          # Data models
│   ├── pkg/websocket/       # WebSocket implementation
│   └── README.md           # Backend documentation
└── README.md               # This file
```

## 🔧 Development

### Frontend Development
```bash
cd frontend 

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Backend Development
```bash
cd backend

# Install dependencies
go mod tidy

# Run development server
go run ./cmd/server

# Build for production
go build -o casino-backend ./cmd/server

# Run tests
go test ./...
```

### Database Migrations
```bash
cd backend

# Apply pending migrations
./casino-backend migrate

# Check migration status
./casino-backend migration-status

# Rollback migrations
./casino-backend rollback 1
```

## 🌐 API Documentation

### Frontend (Next.js)
- `GET /` - Main roulette interface
- Static assets and pages served by Next.js

### Backend (Go)
- `GET /health` - System health check
- `GET /api/roulette/{key}` - Get session history
- `POST /api/roulette/save` - Save new number
- `PUT /api/roulette/{key}` - Update session
- `WS /ws` - WebSocket connection

See component documentation:
- [Frontend API Documentation](frontend/README.md)
- [Backend API Documentation](backend/README.md)

## 🚀 Production Deploy

Frontend and backend are deployed separately.

### Backend
```bash
cd backend
make deploy-prep
tar -czf casino-backend.tar.gz -C dist casino-backend
```

Server-side release script:
- `backend/deploy/deploy_backend.sh`

Expected server layout:
```bash
/srv/casino/
  releases/backend/
  current/backend -> /srv/casino/releases/backend/<timestamp>
  shared/backend/env/backend.env
```

The backend deploy script:
- extracts a new release
- loads `/srv/casino/shared/backend/env/backend.env`
- runs built-in migrations via `casino-server migrate`
- switches `current/backend`
- restarts `casino-backend`

### Frontend
```bash
cd frontend
yarn deploy:prep
tar -czf casino-frontend.tar.gz -C dist casino-frontend
```

Server-side release script:
- `frontend/deploy/deploy_frontend.sh`

Expected server layout:
```bash
/srv/casino/
  releases/frontend/
  current/frontend -> /srv/casino/releases/frontend/<timestamp>
  shared/frontend/env/frontend.env
```

The frontend deploy script expects a Next.js standalone bundle with:
- `server.js`
- `.next/static`
- `public/`

It then switches `current/frontend` and restarts `casino-frontend`.

## 📊 Performance

### Frontend (Next.js)
- **First Load**: ~800ms
- **Route Changes**: ~100ms
- **Bundle Size**: ~200KB gzipped
- **Lighthouse Score**: 95+

### Backend (Go)
- **Memory Usage**: ~10MB
- **Response Time**: <1ms (cached)
- **Throughput**: 50,000+ req/s
- **WebSocket Connections**: 10,000+

## 📚 Documentation

- [📖 **Frontend Guide**](frontend/README.md) - Next.js application documentation
- [⚙️ **Backend Guide**](backend/README.md) - Go server documentation

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Emotion + CSS-in-JS
- **State**: Redux Toolkit + React Query
- **Forms**: React Hook Form + Zod
- **Real-time**: WebSocket client

### Backend
- **Language**: Go 1.22+
- **Database**: PostgreSQL with fallback
- **WebSocket**: Gorilla WebSocket
- **Migrations**: Built-in system
- **Testing**: Go testing framework
- **Monitoring**: Built-in health checks

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure CI/CD passes

### Component Guidelines
- **Frontend**: Follow React/Next.js best practices
- **Backend**: Follow Go conventions and patterns
- **Database**: Use migrations for schema changes
- **API**: Maintain backward compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/SF5RP/casino/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/SF5RP/casino/discussions)
- 📧 **Email**: support@casino-app.com

## 🗺️ Roadmap

### Frontend
- [ ] PWA support
- [ ] Dark/Light theme
- [ ] Multi-language support
- [ ] Advanced statistics dashboard
- [ ] Mobile app (React Native)

### Backend
- [ ] Authentication system
- [ ] Rate limiting
- [ ] Caching layer (Redis)
- [ ] Metrics collection (Prometheus)
- [ ] GraphQL API

### Infrastructure
- [ ] Kubernetes deployment
- [ ] Load balancing
- [ ] Monitoring dashboard
- [ ] Automated backups
- [ ] Multi-region deployment

---

⭐ **Star this repository if you find it useful!**

Made with ❤️ by [SF5RP](https://github.com/SF5RP)
