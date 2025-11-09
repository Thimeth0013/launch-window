# 🚀 Launch Window

A centralized platform to watch rocket launches from multiple live streams in different languages and perspectives. Launch Window automatically aggregates live streams from YouTube channels when launches are scheduled, providing a one-stop destination for space enthusiasts.

## ✨ Features

- 📅 **Automatic Launch Discovery** - Fetches upcoming rocket launches from Launch Library 2 API
- 📺 **Multi-Stream Viewing** - Watch launches from multiple YouTube channels simultaneously
- 🌍 **Multiple Perspectives** - Different takes, languages, and camera angles all in one place
- ⏱️ **Countdown Timers** - Real-time countdown to each launch
- 🔄 **Auto-Update** - Scheduled updates every 6 hours for new launches and streams
- 🧹 **Automatic Cleanup** - Old launches and streams are automatically removed 24 hours after launch
- 🎯 **Smart Matching** - Intelligent algorithm matches streams to launches
- 🔍 **Curated Sources** - Only searches trusted space streaming channels

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express** - REST API server
- **MongoDB** + **Mongoose** - Database for launches and streams
- **Axios** - HTTP client for external APIs
- **node-cron** - Scheduled tasks for updates and cleanup

### Frontend
- **React** + **Vite** - Fast, modern UI framework
- **Tailwind CSS v4** - Utility-first styling
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icon library

### External APIs
- **Launch Library 2** - Comprehensive rocket launch data
- **YouTube Data API v3** - Stream discovery and embedding

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB 5.0+ (local or MongoDB Atlas)
- YouTube Data API key ([Get one here](https://console.cloud.google.com/))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/launch-window.git
cd launch-window
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/launch-window
YOUTUBE_API_KEY=your_youtube_api_key_here
NODE_ENV=development
```

**MongoDB Atlas users:** Replace `MONGODB_URI` with your connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/launch-window?retryWrites=true&w=majority
```

Start the backend:

```bash
npm run dev
```

Backend will start on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend will start on `http://localhost:3000`

## 🔍 How It Works

1. **Launch Discovery**: Every 6 hours, the system fetches upcoming launches from Launch Library 2 API
2. **Stream Matching**: For launches within 7 days, it searches YouTube channels for matching streams
3. **Smart Filtering**: Only streams from trusted channels are included
4. **Database Storage**: Launches and streams are stored in MongoDB with relationships
5. **Automatic Cleanup**: 24 hours after a launch, it's automatically removed along with associated streams
6. **Frontend Display**: React frontend fetches data and displays launches with embedded streams

Made with ❤️ for space enthusiasts everywhere