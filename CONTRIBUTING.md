# Contributing to viettrace-map

Welcome to the **viettrace-map** project – part of the viettrace open ecosystem aimed at preserving Vietnam's geographical, cultural, and administrative information. We greatly appreciate your interest in improving this project!

## What you can contribute

- Feature suggestions, ideas
- Bug reports
- Fix minor bugs or upgrade the source code
- Translate the interface into other languages
- Improve project documentation
- Contribute geographic data (communes, districts, provinces)

---

## How to get started

### 1. Fork & Clone

```bash
git clone https://github.com/viettrace/viettrace-map.git
cd viettrace-map
git checkout -b feature/your-feature-name
```

### 2. Set up the development environment

- Web: `cd apps/web && pnpm install && pnpm dev`
- Mobile: `cd apps/mobile && flutter pub get`
- API: `cd api && pnpm install && pnpm start:dev`

### 3. Commit according to standards

We use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) commit convention:

```bash
git commit -m “feat(map): add district boundary layer display”
git push origin feature/your-feature-name
```

### 4. Submit a Pull Request

Go to the GitHub page → create a Pull Request from your branch to `main`.
We will review and respond as soon as possible.

---

## Some notes

- Write clean code with clear comments
- Respect the existing directory structure
- If you add a major feature, clearly state it in the `README.md` section
- If you add geojson files or local data, clearly state the source and license

---

## Join the community

You can join via:

- GitHub Discussions (coming soon)
- Zalo group, Telegram, or Discord (will be updated at viettrace.org)
- Posting articles on the blog (planned for phase 2)

---

## Thank you!

Whether you are a developer, designer, researcher, student, or someone who loves Vietnam—all contributions are appreciated.

Together, we preserve what matters
