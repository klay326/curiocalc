# 🧮 CurioCalc

**The open-source calculator collection community.**

Browse, catalog, and share your calculator collection. Think VinWiki but for calculators — from everyday scientific models to the bizarre and obscure.

🌐 **[curiocalc.org](https://curiocalc.org)**

---

## Features

- 📖 **Community catalog** — thousands of calculators, Wikipedia-style editable entries
- 🗃️ **Personal collections** — track what you own, want, or have sold
- 📸 **Photo uploads** — document your pieces with your own photos
- 🌀 **Weirdness score** — special love for bizarre, rare, and unusual models
- 🔗 **External refs** — linked to Datamath Museum, my.calcs.quest, and more
- 📱 **Mobile app** — iOS & Android via Expo

## Stack

| Layer | Tech |
|---|---|
| Backend | Python + FastAPI |
| Database | PostgreSQL + Redis |
| Storage | Cloudflare R2 |
| Web | Next.js + TypeScript + Tailwind |
| Mobile | Expo (React Native) |
| Infra | Docker Compose + Caddy + Cloudflare Tunnel |

## Getting started (local dev)

```bash
git clone https://github.com/yourusername/curiocalc
cd curiocalc

cp .env.example .env
# Edit .env — set SECRET_KEY at minimum

docker compose up
```

- API + docs: http://localhost:8000/api/docs
- Web app: http://localhost:3000

## Seeding the catalog

```bash
# Get an API token first (register via /api/docs, then login)
python scripts/seed_databank.py --token YOUR_TOKEN --limit 50
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All are welcome — especially if you know
obscure calculators we're missing!

## License

[AGPL-3.0](LICENSE) — if you run a modified version publicly, you must share your source.
