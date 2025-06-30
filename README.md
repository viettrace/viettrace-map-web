# viettrace-map

**viettrace-map** is the core open-source project of the “viettrace” ecosystem, providing a platform for Vietnam's administrative maps to serve various social applications such as environmental protection, volunteer work, tourism, education, and heritage preservation.

The project enables users to search for current locations and compare them with old or new administrative information based on administrative data before and after mergers.

---

## Objectives

- Provide administrative maps of Vietnam at the provincial/district/commune level
- Compare administrative changes over time
- Integrate with multiple social applications (charity, environment, education, etc.)
- Support multiple platforms: Web, Android, iOS
- Synchronize the interface and user experience across platforms

---

## System Architecture

```
apps/
├── web/         → Next.js + MapLibre GL JS
├── mobile/      → Flutter + maplibre_gl
packages/
├── map-core/    → Shared map logic library (web & mobile)
└── ui-kit/      → Common UI components
api/             → NestJS backend + PostgreSQL + PostGIS
data/            → GeoJSON administrative data
```

---

## Technologies used

| Component | Technology |
|-----------|-----------|
| Web       | Next.js + MapLibre GL JS |
| Mobile    | Flutter + maplibre_gl |
| Backend   | NestJS (Node.js) |
| Database  | PostgreSQL + PostGIS |
| UI Kit    | TailwindCSS (web) / Flutter Theme (mobile) |

---

## Installation

> Installation will be divided into each sub-application in the `apps/` directory

### 1. Web
```bash
cd apps/web
pnpm install
pnpm dev
```

### 2. Mobile
```bash
cd apps/mobile
flutter pub get
flutter run
```

### 3. Backend API
```bash
cd api
pnpm install
pnpm start:dev
```

---

## Administrative data

- Full GeoJSON file of administrative levels is located in `data/geojson/`
- Collected from OpenStreetMap + processed with QGIS/scripts
- Can be imported into PostGIS for query optimization

---

## Development Roadmap

- [x] Set up multi-platform structure
- [ ] Display administrative maps on web/mobile
- [ ] Click on a location to display old/new administrative information
- [ ] API for querying place names by coordinates
- [ ] Provide Map SDK for integration into other apps

---

## Contributions

We welcome pull requests, issues, suggestions, discussions, and translations!

- Check out the `CONTRIBUTING.md` file to get started
- The project uses Vietnamese and English as its primary languages

---

## License

MIT © viettrace.org