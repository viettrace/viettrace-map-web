## Description
<!-- A clear and concise description of the changes you've made and why they're needed -->

## Type of Change
<!-- What type of change does your code introduce? Put an `x` in all the boxes that apply: -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Test update
- [ ] Configuration change
- [ ] Style change
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Security fix
- [ ] Internationalization/Localization
- [ ] Accessibility improvements
- [ ] Chore (cleanup, dependency updates, etc.)
- [ ] Others: please specify it here

## Related Issue
<!-- If this PR fixes or references a GitHub issue, mention it here using `#issue-number`. For example: "Fixes #123", "Closes #456", "Relates to #789" -->

Fixes #
Closes #
Relates to #

## 📱 Browser/Device Testing
<!-- Check all browsers and devices where you've tested -->

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile (iOS Safari)
- [ ] Mobile (Android Chrome)
- [ ] Tablet
- [ ] Others: please specify it here

## Checklist
<!-- Go over all the following points, and put an `x` in all the boxes that apply. -->

### Code Quality
- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] No console.log statements left in code
- [ ] TypeScript types are properly defined
- [ ] ESLint passes without errors
- [ ] Prettier formatting applied
- [ ] Added tests to cover changes (if applicable)
- [ ] Existing project checks passed (`pnpm lint`, and `pnpm build` when applicable)
- [ ] `pnpm lint` passed
- [ ] `pnpm build` passed, or documented why it could not be run locally
- [ ] Vercel preview checked (if available and UI/map behavior changed)

### Documentation
- [ ] README updated (if needed)
- [ ] Component documentation updated (if applicable)
- [ ] `../viettrace-plans/` updated if roadmap, deploy, architecture, or data process changed
- [ ] Added appropriate labels to this PR.

### Dependencies
- [ ] No unnecessary dependencies added
- [ ] Package.json and pnpm-lock.yaml are in sync

### Git
- [ ] Descriptive commit messages
- [ ] Branch is up to date with main
- [ ] No merge conflicts

### Viettrace Map/Data
- [ ] Tile URLs remain environment-driven; no hardcoded local/production tile URLs in source
- [ ] MapLibre source-layer names are unchanged, or tile server docs/config were updated too
- [ ] OSM attribution remains visible
- [ ] `src/locales/en.json` and `src/locales/vi.json` were both updated for copy changes
- [ ] Data/metadata source or process changes are documented in `../viettrace-plans/04-data/`

## Screenshots/Videos (if applicable)
<!-- Add screenshots to help explain your changes if they include visual changes. -->

## Additional Notes
<!-- Add any other context about the pull request here. -->

_Thank you for contributing to viettrace-map-web! Make sure you've read `CONTRIBUTING.md`_
