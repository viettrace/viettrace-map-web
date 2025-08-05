# Contributing to viettrace-map-web

Welcome to **viettrace-map-web** – part of the viettrace open ecosystem dedicated to preserving and sharing Vietnam's geographical, cultural, and administrative heritage. We're thrilled that you're interested in contributing to this important project!

## Our Mission

We're building a comprehensive, open-source platform that makes Vietnam's geographic and cultural data accessible to everyone. Your contributions help preserve our nation's heritage for future generations while supporting researchers, developers, educators, and curious minds worldwide.

## Table of Contents

- [Ways to Contribute](#-ways-to-contribute)
- [Getting Started](#-getting-started)
- [Development Guidelines](#-development-guidelines)
- [Submitting Changes](#-submitting-changes)
- [Community Guidelines](#-community-guidelines)
- [Resources](#-resources)

## Ways to Contribute

### For Everyone
- **Report bugs** - Help us identify and fix issues
- **Suggest features** - Share ideas for new functionality
- **Improve documentation** - Make our guides clearer and more comprehensive
- **Translate content** - Help make the project accessible in multiple languages
- **Contribute data** - Share geographic, cultural, or administrative data
- **Design improvements** - Enhance UI/UX and visual elements
- **Spread the word** - Help grow our community

### For Developers
- **Fix bugs** - Resolve issues in the codebase
- **Add features** - Implement new functionality
- **Performance improvements** - Optimize code and user experience
- **Write tests** - Improve code coverage and reliability
- **Code reviews** - Help maintain code quality

### For Data Contributors
- **Geographic data** - Administrative boundaries, landmarks, geographical features
- **Cultural data** - Historical sites, cultural landmarks, traditions
- **Location data** - Points of interest, local businesses, facilities
- **Educational content** - Historical context, cultural significance

## Getting Started

### Understanding the Codebase

Before contributing, familiarize yourself with our [project structure](docs/project-structure.md).

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.17.0 or higher
- **pnpm** (recommended) or npm/yarn
- **Git** for version control
- A **GitHub account**

### Development Setup

#### 1. Fork and Clone the Repository

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/viettrace-map-web.git
cd viettrace-map-web

# Add the original repository as upstream
git remote add upstream https://github.com/viettrace/viettrace-map-web.git
```

#### 2. Install Dependencies

```bash
# Install all dependencies
pnpm install --frozen-lockfile

# Or if using npm
npm ci
```

#### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit the environment variables as needed
# Contact maintainers if you need access to development APIs
```

#### 4. Start Development Server

```bash
# Start the development server
pnpm dev

# The application will be available at http://localhost:3000
```

#### 5. Verify Your Setup

- Open http://localhost:3000 in your browser
- Check that the map loads correctly
- Verify that all interactive features work
- Check the browser console for any errors

## Development Guidelines

### Code Standards

#### TypeScript
- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary
- Use strict mode TypeScript configuration

#### Code Style
- Follow the existing code formatting (Prettier configuration)
- Use meaningful variable and function names
- Write clear, concise comments for complex logic
- Follow React best practices and hooks patterns

#### File Naming
- Use kebab-case for files and directories
- Use PascalCase for React components
- Use camelCase for functions and variables
- Use UPPER_CASE for constants

#### Component Guidelines
```jsx
// Good: Functional component with proper typing
interface MapComponentProps {
  data: GeoJSONData;
  onLocationSelect: (location: Location) => void;
}

export default function MapComponent({ data, onLocationSelect }: MapComponentProps) {
  // Component implementation
}
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clear project history:

#### Commit Types
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `build`: Build system changes
- `ci`: CI/CD changes

#### Commit Format
```bash
type(scope): description

# Examples:
git commit -m "feat(map): add district boundary layer display"
git commit -m "fix(search): resolve location search accuracy issue"
git commit -m "docs(api): update geocoding endpoint documentation"
git commit -m "style(components): improve map marker hover effects"
```

#### Scopes
Common scopes in our project:
- `map`: Map-related features
- `search`: Search functionality
- `data`: Data processing and management
- `ui`: User interface components
- `api`: API routes and external integrations
- `auth`: Authentication features
- `i18n`: Internationalization
- `docs`: Documentation

### Branch Naming

Use descriptive branch names that follow this pattern:
```bash
type/scope-description

# Examples:
feature/map-layer-controls
fix/search-performance-issue
docs/contributing-guide-update
refactor/data-processing-pipeline
```

### Testing Guidelines

#### Writing Tests
- Write tests for new features and bug fixes
- Aim for meaningful test coverage, not just high percentages
- Use descriptive test names that explain the expected behavior
- Test both happy paths and edge cases

#### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test components/MapComponent.test.tsx
```

### Data Contribution Guidelines

#### Geographic Data
- **Format**: Prefer GeoJSON format for geographic data
- **Accuracy**: Ensure coordinate accuracy appropriate for the scale
- **Source**: Always document the data source and date
- **License**: Verify data can be used under our open-source license
- **Validation**: Test data loads correctly in the application

#### Data Quality Standards
- Use consistent naming conventions
- Include proper metadata (source, date, accuracy, etc.)
- Validate data integrity before submission
- Follow Vietnamese administrative naming conventions
- Include both Vietnamese and English names where applicable

#### Example Data Structure
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "source": "General Statistics Office of Vietnam",
    "date": "2023-01-01",
    "accuracy": "1:50000",
    "license": "Open Database License"
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name_vi": "Hà Nội",
        "name_en": "Hanoi",
        "type": "province",
        "code": "01"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## Submitting Changes

### Before You Submit

1. **Sync with upstream** to avoid conflicts:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Test your changes**:
   ```bash
   pnpm test
   pnpm build
   pnpm lint
   ```

3. **Update documentation** if needed

### Pull Request Process

#### 1. Create a Pull Request
- Go to your fork on GitHub
- Click "New Pull Request"
- Select your feature branch
- Fill out the pull request template completely

#### 2. Pull Request Guidelines
- **Title**: Use the same format as commit messages
- **Description**: Clearly explain what changes you made and why
- **Screenshots**: Include before/after screenshots for UI changes
- **Testing**: Describe how you tested your changes
- **Breaking Changes**: Clearly document any breaking changes

#### 3. Review Process
- Maintainers will review your PR within 3-5 business days
- Address any feedback promptly
- Keep your PR up to date with the main branch
- Be patient and respectful during the review process

#### 4. After Approval
- Maintainers will merge your PR
- Your contribution will be acknowledged in our release notes
- Consider watching the repository for future updates

### Pull Request Template Checklist

When submitting a PR, ensure you've completed:

- [ ] Followed the code style guidelines
- [ ] Written/updated tests for your changes
- [ ] Updated documentation if necessary
- [ ] Tested your changes thoroughly
- [ ] Used conventional commit messages
- [ ] Linked any relevant issues
- [ ] Added screenshots for UI changes
- [ ] Considered performance implications
- [ ] Verified accessibility compliance

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must:

- **Be respectful** - Treat everyone with kindness and respect
- **Be inclusive** - Welcome people of all backgrounds and experience levels
- **Be collaborative** - Help others learn and grow
- **Be constructive** - Provide helpful feedback and suggestions
- **Be patient** - Remember that everyone is learning

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for more information

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussions
- **Pull Requests**: Code review and technical discussions

### Getting Help

If you need help:

1. **Check existing documentation** and issues first
2. **Search GitHub Discussions** for similar questions
3. **Create a new discussion** with a descriptive title
4. **Be specific** about your problem and include relevant details
5. **Be patient** - maintainers respond as time allows

### Mentorship

New to open source? We're here to help!

- Look for issues labeled `good first issue`
- Don't hesitate to ask questions
- Pair with experienced contributors when possible
- Start with small contributions and gradually take on bigger challenges

## Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Leaflet Documentation](https://leafletjs.com/reference.html)

### Vietnam Geographic Data Sources
- [General Statistics Office of Vietnam](https://www.gso.gov.vn/)
- [Vietnam National University GIS Portal](http://gis.vnu.edu.vn/)
- [OpenStreetMap Vietnam](https://openstreetmap.org/relation/49915)

### Tools and References
- [GeoJSON Format Specification](https://tools.ietf.org/html/rfc7946)
- [QGIS](https://qgis.org/) - Geographic data processing
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

### Learning Resources
- [Open Source Guide](https://opensource.guide/)
- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [React Tutorial](https://react.dev/learn)
- [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

## Recognition

We value every contribution! Contributors will be:

- **Acknowledged** in our release notes
- **Listed** in our contributors section
- **Invited** to join our contributor community
- **Eligible** for special recognition badges
- **Considered** for maintainer roles based on consistent, quality contributions

## Contact

- **Email**: lam.tttech19@gmail.com

---

## Thank You!

Your contributions help preserve Vietnam's rich geographical and cultural heritage for current and future generations. Whether you're a developer, designer, researcher, student, or simply someone who loves Vietnam, every contribution matters.

Together, we preserve what matters most. 🇻🇳

---

**Last Updated**: August 5, 2025

**Version**: 2.0

*This document is a living guide. If you have suggestions for improvement, please open an issue or submit a pull request.*
