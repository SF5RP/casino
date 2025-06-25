# Casino Roulette - Frontend

🎰 Next.js frontend application for casino roulette with real-time updates and advanced analytics.

## ✨ Features

- 🎯 **Real-time Roulette Board** - Live number tracking with WebSocket
- 📊 **Advanced Statistics** - Color, sector, row, and pattern analysis
- 🔮 **Forecast System** - Predictive algorithms for next numbers
- 📱 **Responsive Design** - Mobile-first responsive layout
- ⚡ **SSR Support** - Server-side rendering for performance
- 🎨 **Modern UI** - Emotion-based styling with smooth animations
- 🔄 **Real-time Updates** - Live data synchronization with backend

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Emotion + CSS-in-JS
- **State Management**: Redux Toolkit + React Query
- **Forms**: React Hook Form + Zod validation
- **Real-time**: WebSocket client
- **Build Tool**: Next.js built-in bundler

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Start development server
npm run dev
# or
yarn dev

# Open browser
# http://localhost:3000
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Production deployment
npm run deploy       # Deploy to production
```

## 📁 Project Structure

```
frontend/
├── src/                     # Source code
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   ├── globals.css      # Global styles
│   │   └── providers.tsx    # App providers
│   ├── components/          # React components
│   │   └── casino/          # Roulette-specific components
│   │       ├── components/  # UI components
│   │       ├── hooks/       # Custom hooks
│   │       ├── types/       # TypeScript types
│   │       ├── utils/       # Utility functions
│   │       └── constants/   # Constants
│   ├── lib/                 # Libraries and utilities
│   │   └── api/            # API client
│   └── config/             # Configuration
├── public/                 # Static assets
├── package.json           # Dependencies and scripts
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── README.md             # This file
```

## 🎮 Components Overview

### Core Components
- **RouletteBoard** - Main roulette table with numbers
- **RouletteCell** - Individual number cell with statistics
- **StatsPanel** - Statistics dashboard
- **ForecastPanel** - Prediction algorithms
- **HistoryPanel** - Game history display
- **GameInfo** - Current game information

### Analysis Components
- **ColorAnalysis** - Red/Black/Green analysis
- **EvenOddAnalysis** - Even/Odd number patterns
- **RowAnalysis** - Row-based statistics
- **SectorAnalysis** - Sector distribution analysis

### UI Components
- **BetButton** - Betting interface buttons
- **CellTooltip** - Number cell tooltips
- **FloatingButtons** - Action buttons
- **SettingsPanel** - Application settings

## 🔧 Configuration

### Environment Variables

Create `.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws

# Development settings
NODE_ENV=development
```

### WebSocket Configuration

```typescript
// src/config/websocket.ts
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
```

## 🎯 Key Features

### Real-time Updates
- WebSocket connection to Go backend
- Live number updates
- Real-time statistics recalculation
- Connection status monitoring

### Advanced Analytics
- **Color Analysis**: Red/Black/Green distribution
- **Pattern Recognition**: Hot/Cold numbers
- **Sector Analysis**: Wheel sector statistics
- **Trend Analysis**: Number frequency patterns

### Forecast System
- Multiple prediction algorithms
- Confidence scoring
- Historical accuracy tracking
- Pattern-based predictions

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Adaptive layouts
- Cross-browser compatibility

## 🔄 State Management

### Redux Store Structure
```typescript
interface AppState {
  roulette: {
    history: number[];
    currentSession: string;
    statistics: RouletteStats;
    settings: RouletteSettings;
  };
  ui: {
    activePanel: string;
    isConnected: boolean;
    loading: boolean;
  };
}
```

### React Query Usage
- API data fetching
- Cache management
- Background updates
- Error handling

## 🎨 Styling

### Emotion Setup
```typescript
// Styled components
const RouletteCell = styled.div<{ color: string }>`
  background-color: ${props => props.color};
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;
```

### CSS Variables
```css
:root {
  --color-red: #dc2626;
  --color-black: #1f2937;
  --color-green: #16a34a;
  --border-radius: 8px;
  --transition: all 0.3s ease;
}
```

## 📊 Performance

### Optimization Features
- Code splitting with dynamic imports
- Image optimization with Next.js
- Bundle analysis and optimization
- Lazy loading of components
- Memoization of expensive calculations

### Metrics
- **First Load**: ~800ms
- **Route Changes**: ~100ms
- **Bundle Size**: ~200KB gzipped
- **Lighthouse Score**: 95+

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment
```bash
# Build Docker image
docker build -t casino-frontend .

# Run container
docker run -p 3000:3000 casino-frontend
```

### Environment Setup
```bash
# Production environment
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
```

## 🔗 API Integration

### Backend Communication
- REST API for data operations
- WebSocket for real-time updates
- Error handling and retry logic
- Request/response interceptors

### Example API Usage
```typescript
// Fetch roulette history
const { data, isLoading } = useQuery({
  queryKey: ['roulette', sessionKey],
  queryFn: () => rouletteApi.getHistory(sessionKey)
});

// Save new number
const saveMutation = useMutation({
  mutationFn: rouletteApi.saveNumber,
  onSuccess: () => queryClient.invalidateQueries(['roulette'])
});
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check backend server is running
   - Verify WebSocket URL in config
   - Check network connectivity

2. **Build Errors**
   - Clear `.next` folder
   - Delete `node_modules` and reinstall
   - Check TypeScript errors

3. **Performance Issues**
   - Enable React DevTools Profiler
   - Check for unnecessary re-renders
   - Optimize heavy calculations

## 🤝 Contributing

1. Follow existing code style
2. Add TypeScript types for new features
3. Write tests for new components
4. Update documentation
5. Ensure responsive design

## 📄 License

This project is part of the Casino Roulette application.

---

For backend documentation, see [../backend/README.md](../backend/README.md)
For project overview, see [../README.md](../README.md) 