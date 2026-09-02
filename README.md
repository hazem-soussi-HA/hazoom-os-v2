# 🐂 HAZOOM OS v2.6

> A complete web-based operating system with AI agents, procedural audio, animated backgrounds, and 19+ applications.

![HAZOOM OS](https://img.shields.io/badge/HAZOOM-OS-6c5ce7?style=for-the-badge)
![Version](https://img.shields.io/badge/version-2.6.0-4ecdc4?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-feca57?style=for-the-badge)

## ✨ Features

### 🖥️ Operating System
- **Window Manager** — Drag, resize, minimize, maximize, snap to edges
- **Virtual File System** — Full directory tree with files
- **Taskbar** — Running apps, system tray, clock
- **Start Menu** — Searchable app grid
- **Desktop Icons** — Quick launch shortcuts
- **Lock Screen** — PIN protection
- **Shutdown Dialog** — Sleep, restart, shutdown

### 🤖 AI Agent Network
- **Ox Alpha** — Central intelligence orchestrator
- **Owl** — Knowledge guardian, reads files
- **Doctor** — System health diagnostics
- **Hunter** — Search and discovery
- **Lynx** — Pattern analysis and insights

### 🎵 Procedural Audio
- **19 Sound Effects** — Boot, click, open, close, snap, notify, etc.
- **8 Music Tracks** — Procedurally generated synth music
- **Hover Sounds** — Subtle ticks on UI elements
- **Keyboard Sounds** — Ascending/descending blips

### 🎨 Visual Effects
- **Animated Background** — Particles, grid, light beams, floating shapes
- **Agent Sprites** — Tom & Jerry style chase dynamics
- **Glassmorphism UI** — Blur effects, transparency
- **Window Animations** — Open, close, minimize transitions

### 📱 19 Applications
| App | Description |
|-----|-------------|
| Terminal | Command line with pipes, grep, alias |
| Files | File manager with preview pane |
| Text Editor | Find & replace, word wrap |
| Code Editor | Line numbers, syntax support |
| Calculator | Memory functions, history |
| Browser | Multi-tab web browser |
| System Monitor | CPU/memory charts |
| Process Manager | Process list with kill |
| I/O Panel | Peripheral management |
| Settings | Themes, wallpaper picker |
| Music | Procedural music player |
| Gallery | Image viewer |
| Clock | Live time display |
| Weather | Forecast with details |
| Notes | Multi-note editor |
| Calendar | Month view with events |
| Disk Usage | Storage visualization |
| AI Agent | Chat with AI agents |
| Ping Test | Network diagnostics |

## 🚀 Quick Start

### Local Development
```bash
git clone https://github.com/hazem-soussi/hazoom-os.git
cd hazoom-os
npm start
# Open http://localhost:8888
```

### Docker
```bash
docker build -t hazoom-os .
docker run -p 8888:8888 hazoom-os
```

### Production
```bash
chmod +x deploy.sh
./deploy.sh
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | Open Terminal |
| `Ctrl+E` | Open Text Editor |
| `Ctrl+F` | Open Files |
| `Ctrl+L` | Lock Screen |
| `Ctrl+Shift+C` | Clipboard Manager |
| `Alt+Tab` | Switch Windows |
| `Meta` | Start Menu |
| `Space` | Play/Pause (in apps) |

## 🏗️ Architecture

```
hazoom-os/
├── index.html          # Complete OS (HTML + CSS + JS)
├── server.js           # Node.js HTTP server
├── health.js           # Health check endpoint
├── Dockerfile          # Docker configuration
├── nginx.conf          # Production nginx config
├── deploy.sh           # Deployment script
├── LICENSE             # MIT License
├── ETHICAL_TERMS.md    # Ethical use guidelines
├── CONTRIBUTING.md     # Contribution guide
└── .github/workflows/  # CI/CD pipeline
```

## 🔒 Security

- No external dependencies in production
- No data collection or telemetry
- All AI runs locally in browser
- CSP headers enabled in production
- XSS protection headers

## 📜 Ethical Use

HAZOOM OS is built on ethical foundations. See [ETHICAL_TERMS.md](ETHICAL_TERMS.md) for our principles and prohibited uses.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License — See [LICENSE](LICENSE)

---

**Built with purpose. Used with integrity. Shared with love.**

*Created by Hazem Soussi — Lead Computing Architect*
