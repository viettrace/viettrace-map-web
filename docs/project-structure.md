# Project Structure

This document provides a comprehensive overview of the viettrace-map-web project structure, explaining the purpose and organization of each directory and key files.

## Root Directory Overview

```
viettrace-map-web/
├── .github/                 # GitHub-specific files and workflows
├── .vscode/                 # VSCode workspace configuration
├── docs/                    # Project documentation
├── public/                  # Static assets served directly
├── src/                     # Source code (Next.js App Router structure)
├── .commitlintrc.json      # Commit message linting rules
├── .editorconfig           # Editor configuration
├── .env.sample             # Environment variables template
├── .gitattributes          # Git attributes configuration
├── .gitignore              # Git ignore rules
├── .npmrc                  # NPM configuration
├── .nvmrc                  # Node.js version specification
├── .prettierignore         # Prettier ignore rules
├── .prettierrc             # Code formatting configuration
├── .release-it.json        # Release automation configuration
├── .txt                    # Additional project notes
├── CHANGELOG.md            # Project changelog
├── CODE_OF_CONDUCT.md      # Community guidelines
├── CONTRIBUTING.md         # Contribution guidelines
├── eslint.config.mjs       # ESLint configuration (ESLint 9+)
├── knip.json               # Unused code detection configuration
├── lefthook.yml            # Git hooks configuration
├── LICENSE                 # Project license
├── next-env.d.ts           # Next.js TypeScript declarations
├── next.config.ts          # Next.js configuration
├── package.json            # Package dependencies and scripts
├── pnpm-lock.yaml          # PNPM lock file
├── postcss.config.mjs      # PostCSS configuration
├── README.md               # Project overview and quick start
└── tsconfig.json           # TypeScript configuration
```

## Detailed Directory Structure

### `.github/` - GitHub Configuration
```
.github/
├── ISSUE_TEMPLATE/          # Issue templates
│   ├── bug_report.md        # Bug report template
│   └── feature_request.md   # Feature request template
├── workflows/               # GitHub Actions workflows
│   └── release.yml          # Automated release workflow
├── dependabot.yml           # Dependabot configuration for dependency updates
└── PULL_REQUEST_TEMPLATE.md # Pull request template
```

**Purpose**: Automates GitHub workflows, standardizes issue reporting, and manages dependency updates.

### `.vscode/` - VSCode Configuration
```
.vscode/
└── settings.json            # Workspace-specific VSCode settings
```

**Purpose**: Ensures consistent development environment settings across team members using VSCode.

### `docs/` - Project Documentation
```
docs/
└── project-structure.md     # This file - project structure documentation
```

**Purpose**: Houses comprehensive project documentation. Can be expanded with:
- API documentation
- Development guides
- Data documentation
- User guides
- Architecture diagrams

**Recommended Expansion**:
```
docs/
├── api/                     # API documentation
├── development/             # Development guides
├── data/                    # Data documentation
├── user-guide/              # User documentation
└── project-structure.md     # Current file
```

### `public/` - Static Assets
```
public/
├── favicon/                 # Favicon files
│   └── favicon.ico          # Main favicon
└── svg/                     # SVG assets
    ├── file.svg             # File icon
    ├── globe.svg            # Globe icon (likely for map features)
    ├── next.svg             # Next.js logo
    ├── vercel.svg           # Vercel logo
    └── window.svg           # Window icon
```

**Purpose**: Static files served directly by Next.js without processing.

**Recommended Expansion**:
```
public/
├── favicon/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── manifest-icons/      # PWA icons
├── images/                  # Static images
│   ├── logo/                # Project logos
│   ├── screenshots/         # App screenshots
│   └── placeholders/        # Placeholder images
├── maps/                    # Map-related assets
│   ├── markers/             # Custom map markers
│   └── tiles/               # Custom map tiles (if any)
├── svg/                     # Current SVG icons
└── data/                    # Publicly accessible sample data
    └── sample.geojson       # Sample GeoJSON files
```

### `src/` - Source Code (Next.js App Router)
```
src/
├── app/                     # Next.js App Router pages and layouts
├── components/              # Reusable React components
├── libs/                    # Core library functions and utilities
├── locales/                 # Internationalization resources
├── styles/                  # Styling files
├── instrumentation-client.ts # Client-side instrumentation (monitoring)
├── instrumentation.ts       # Server-side instrumentation (monitoring)
├── middleware.ts            # Next.js middleware
├── sentry.edge.config.ts    # Sentry configuration for Edge Runtime
└── sentry.server.config.ts  # Sentry configuration for server-side
```

#### `src/app/` - App Router Structure
```
app/
├── [locale]/                # Internationalized routes
│   ├── map/                 # Map feature pages
│   │   └── page.tsx         # Main map page (/[locale]/map)
│   ├── layout.tsx           # Locale-specific layout
│   └── page.tsx             # Homepage (/[locale])
└── global-error.tsx         # Global error boundary
```

**Current Structure Benefits**:
- **Internationalization**: Built-in locale support with `[locale]` dynamic route
- **Clean URLs**: Organized by feature (map)
- **Error Handling**: Global error boundary for unhandled errors

**Recommended Expansion**:
```
app/
├── [locale]/
│   ├── map/
│   │   ├── page.tsx         # Main map page
│   │   ├── [province]/      # Province-specific maps
│   │   │   └── page.tsx
│   │   └── embed/           # Embeddable map
│   │       └── page.tsx
│   ├── data/                # Data browser pages
│   │   ├── page.tsx         # Data overview
│   │   ├── provinces/       # Province data
│   │   └── statistics/      # Statistics dashboard
│   ├── about/               # About pages
│   ├── help/                # Help and documentation
│   ├── api/                 # API routes (if using App Router API)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── loading.tsx          # Loading UI
│   ├── error.tsx            # Error UI
│   └── not-found.tsx        # 404 page
├── api/                     # API routes (alternative location)
└── global-error.tsx
```

#### `src/components/` - React Components
```
components/
└── Map/
    └── Map.tsx              # Main map component
```

**Current State**: Basic map component structure.

**Recommended Expansion**:
```
components/
├── ui/                      # Basic UI components
│   ├── Button/
│   ├── Modal/
│   ├── Input/
│   └── index.ts             # Barrel exports
├── map/                     # Map-related components
│   ├── Map/                 # Current map component
│   │   ├── Map.tsx
│   │   ├── Map.test.tsx
│   │   └── index.ts
│   ├── MapControls/         # Map control panels
│   ├── MapLayers/           # Layer management
│   ├── MapMarkers/          # Marker components
│   └── index.ts
├── layout/                  # Layout components
│   ├── Header/
│   ├── Footer/
│   ├── Sidebar/
│   └── Navigation/
├── search/                  # Search functionality
├── data/                    # Data visualization components
└── common/                  # Shared components
    ├── Loading/
    ├── ErrorBoundary/
    └── LanguageSwitcher/
```

#### `src/libs/` - Core Libraries
```
libs/
└── i18n/                    # Internationalization setup
    ├── navigation.ts        # Internationalized navigation utilities
    ├── request.ts           # Server-side i18n request handling
    └── routing.ts           # Routing configuration for i18n
```

**Current Focus**: Comprehensive i18n setup with next-intl.

**Recommended Expansion**:
```
libs/
├── i18n/                    # Current i18n setup
├── api/                     # API client utilities
│   ├── client.ts            # HTTP client configuration
│   └── endpoints.ts         # API endpoint definitions
├── data/                    # Data processing utilities
│   ├── geojson.ts           # GeoJSON processing
│   ├── validation.ts        # Data validation
│   └── transformation.ts    # Data transformation
├── map/                     # Map utilities
│   ├── config.ts            # Map configuration
│   ├── layers.ts            # Layer management
│   └── projections.ts       # Coordinate projections
├── auth/                    # Authentication utilities (if needed)
└── constants/               # Application constants
    ├── colors.ts
    └── config.ts
```

#### `src/locales/` - Internationalization
```
locales/
└── en.json                  # English translations
```

**Recommended Expansion**:
```
locales/
├── en.json                  # English translations
├── vi.json                  # Vietnamese translations (primary)
├── zh.json                  # Chinese translations
├── fr.json                  # French translations
└── ja.json                  # Japanese translations
```

#### `src/styles/` - Styling
```
styles/
└── globals.css              # Global styles
```

**Recommended Expansion**:
```
styles/
├── globals.css              # Current global styles
├── variables.css            # CSS custom properties
├── components/              # Component-specific styles
├── pages/                   # Page-specific styles
├── themes/                  # Theme definitions
│   ├── light.css
│   └── dark.css
└── utilities/               # Utility classes
```

## Configuration Files Deep Dive

### Development & Code Quality
- **`.commitlintrc.json`** - Enforces conventional commit messages
- **`.editorconfig`** - Consistent editor settings across team
- **`.prettierrc`** & **`.prettierignore`** - Code formatting rules
- **`eslint.config.mjs`** - Modern ESLint configuration (v9+)
- **`knip.json`** - Detects unused dependencies and code
- **`lefthook.yml`** - Git hooks for pre-commit checks

### Build & Runtime
- **`next.config.ts`** - Next.js configuration with TypeScript
- **`tsconfig.json`** - TypeScript compiler settings
- **`postcss.config.mjs`** - PostCSS configuration for CSS processing
- **`.nvmrc`** - Node.js version specification
- **`.npmrc`** - NPM configuration

### Monitoring & Instrumentation
- **`instrumentation.ts`** - Server-side monitoring setup
- **`instrumentation-client.ts`** - Client-side monitoring
- **`sentry.*.config.ts`** - Error tracking with Sentry
- **`middleware.ts`** - Next.js middleware for request processing

### Release & Deployment
- **`.release-it.json`** - Automated release configuration
- **`.github/workflows/release.yml`** - CI/CD pipeline

## Architecture Decisions & Rationales

### Why App Router Structure?
- **Modern Next.js**: Using the latest App Router (Next.js 13+)
- **Built-in Layouts**: Co-located layouts with pages
- **Streaming**: Better loading states and performance
- **Server Components**: Improved performance by default

### Why Internationalization First?
- **Vietnamese Focus**: Primary audience requires Vietnamese language
- **Global Reach**: Making Vietnam's heritage accessible worldwide
- **SEO Benefits**: Localized URLs improve search visibility
- **Cultural Sensitivity**: Proper localization shows respect for culture

### Why TypeScript Configuration?
- **Type Safety**: Catch errors at build time
- **Better DX**: Enhanced developer experience with IntelliSense
- **Maintainability**: Easier refactoring and code understanding
- **Team Collaboration**: Clear interfaces and contracts

### Monitoring & Quality Tools
- **Sentry**: Production error tracking and performance monitoring
- **Instrumentation**: Custom metrics for map performance
- **Quality Gates**: Multiple tools (ESLint, Prettier, Knip) ensure code quality
- **Git Hooks**: Prevent bad commits from entering the repository

## File Naming Conventions

### Components
- **React Components**: PascalCase (`Map.tsx`, `MapControls.tsx`)
- **Component directories**: PascalCase matching component name
- **Test files**: `ComponentName.test.tsx`
- **Index files**: `index.ts` for barrel exports

### Pages (App Router)
- **Pages**: `page.tsx` (App Router convention)
- **Layouts**: `layout.tsx` (App Router convention)
- **Loading**: `loading.tsx` (App Router convention)
- **Errors**: `error.tsx` and `global-error.tsx`
- **Dynamic routes**: `[param]` format

### Configuration & Utilities
- **Config files**: kebab-case (`next.config.ts`, `.prettierrc`)
- **Utility functions**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_CASE (`API_ENDPOINTS.ts`)

## Recommended Next Steps

### Immediate Expansion Priorities

1. **Data Directory Structure**:
   ```
   src/data/
   ├── geojson/
   │   ├── provinces/
   │   ├── districts/
   │   └── communes/
   ├── json/
   │   ├── administrative/
   │   └── cultural/
   └── metadata/
   ```

2. **API Routes** (if using App Router API):
   ```
   app/api/
   ├── data/
   │   ├── provinces/
   │   └── search/
   └── health/
   ```

3. **Enhanced Component Structure**:
   ```
   components/
   ├── map/ (expand current)
   ├── ui/
   ├── layout/
   └── data/
   ```

4. **Testing Infrastructure**:
   ```
   __tests__/
   ├── components/
   ├── pages/
   └── utils/
   ```

### Future Considerations

- **PWA Support**: Add manifest.json and service worker
- **Database Integration**: Add database utilities if needed
- **Authentication**: Add auth components if user features planned
- **Analytics**: Add analytics configuration
- **Docker**: Add containerization for deployment

## Key Strengths of Current Structure

### What's Working Well
- **Modern Next.js**: Using App Router with TypeScript
- **Internationalization**: Proper i18n setup from the start
- **Code Quality**: Comprehensive tooling (ESLint, Prettier, Knip)
- **CI/CD**: Automated releases and dependency management
- **Monitoring**: Sentry integration for production reliability
- **Git Hygiene**: Proper hooks and commit message standards

### Areas for Growth
- **Component Organization**: Expand beyond single Map component
- **Data Management**: Add structured data directories
- **Testing**: Add test directories and configurations
- **Documentation**: Expand docs/ directory
- **API Structure**: Add API routes as features grow

## Related Documentation

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)

---

## Evolution Strategy

This structure is designed to grow with your project. The current foundation provides:

- **Scalability**: Easy to add new features and components
- **Maintainability**: Clear separation of concerns
- **International Reach**: Built-in localization support
- **Quality Assurance**: Multiple layers of code quality checks
- **Production Ready**: Monitoring and error tracking included

As viettrace-map grows, this structure can accommodate:
- Additional map features and visualizations
- User authentication and personalization
- Advanced data processing and APIs
- Community contributions and collaborative features
- Mobile app integration

**Last Updated**: August 5, 2025
**Version**: 1.0
