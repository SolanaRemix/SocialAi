# 🌐 SocialAi  
### The Open Social Index & Identity Claim Network

SocialAi is a lightweight, AI‑powered social discovery engine that mirrors public Farcaster activity, blends optional Reddit timelines, and exposes SEO‑optimized public profiles that users can claim by verifying their Farcaster identity.

It is built on a **parallel, auto‑healing, one‑file node architecture** powered by Healdec and SmartBrain.

---

## ✨ Features

### 🔍 Public Social Index
- SEO‑optimized profiles, posts, timelines  
- Google‑indexable pages  
- Zero‑JS by default (Astro + Vite)  
- Fast SSR for timelines and profiles  

### 🪪 Identity Claim System
- Farcaster Sign‑In  
- Wallet verification (SIWE)  
- ENS mapping  
- Claim → unlock editing + AI tools  

### 🌐 Multi‑Network Sync
- Farcaster Hub ingestion  
- Optional Reddit sync  
- Future: Lens, Bluesky, Zora  
- Admin‑controlled feed toggles  

### 🤖 SocialAi Brain
- Embeddings + vector search  
- Timeline summaries  
- Profile optimization  
- Topic clustering  
- Recommendations  

### 🧩 Social Graph
- Follow / unfollow  
- Likes  
- Saved posts  
- Mutuals  

### 🛠 Admin Console
- Feature flags  
- Sync toggles  
- Logs  
- Worker health  
- Abuse controls  

---

## 🧱 Architecture

For a detailed architecture diagram and component descriptions, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Public Layer (Astro + Vite)
- SEO pages  
- Profiles  
- Timelines  
- Claim flow  
- Landing pages  

### Admin Layer (Angular)
- Feature flags  
- Sync controls  
- Worker monitoring  
- System health  

### Backend (One‑File SocialAi Node)
- Healdec engine  
- Parallel chain workers  
- AI worker  
- Search worker  
- Sync worker  
- RPC workers  

### Database (Postgres)
- Users  
- Profiles  
- Posts  
- External posts  
- Follows  
- Likes  
- Claims  
- Embeddings  
- Feature flags  
- Settings  

---

## 🚀 Getting Started

### Quick Start

```bash
git clone https://github.com/SMSDAO/SocialAi.git
cd SocialAi

# Install dependencies
npm install

# Setup database
createdb socialai
psql -U postgres -d socialai -f db/schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the system
npm run dev                # Backend + Workers
npm run dev:public         # Public App (port 4321)
npm run dev:admin          # Admin Console (port 4200)
```

### Access Points

- 🔌 **Backend API**: http://localhost:3000
- 🌐 **Public App**: http://localhost:4321
- ⚙️ **Admin Console**: http://localhost:4200

For detailed setup instructions, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

## 📚 Documentation

### Core Documentation
- **[Documentation Hub](docs/README.md)** - Complete documentation index and navigation
- **[Installation Guide](docs/INSTALLATION.md)** - Setup and deployment guide
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and component diagrams
- **[API Reference](docs/API.md)** - Full REST API documentation
- **[UI/UX Specifications](docs/UIUXSPECTS.md)** - User interface guidelines

### Feature Documentation
- **[Auto Features](docs/FEATURES.md)** - Auto Sync, Auto Test, Auto Analysis, Auto Fix
- **[Worker System](docs/WORKERS.md)** - Parallel worker architecture guide
- **[Healdec Engine](docs/HEALDEC.md)** - Auto-healing system documentation
- **[SmartBrain Integration](docs/SMARTBRAIN.md)** - AI features and embeddings

### Operational Guides
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

**Start here**: [docs/README.md](docs/README.md) for the complete documentation hub.