---
name: Bug Report
about: Report a bug that occurred in the system
title: '[BUG] Brief description of the bug'
labels: ['bug', 'needs-triage']
assignees: ''
---

## Bug Report

### Description
<!-- A clear and concise description of what the bug is -->


### Steps to Reproduce
<!-- Steps to reproduce the behavior -->
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

### Expected Behavior
<!-- A clear and concise description of what you expected to happen -->


### Actual Behavior
<!-- A clear and concise description of what actually happened -->


### Screenshots/Videos
<!-- If applicable, add screenshots or videos to help explain your problem -->


### Environment
<!-- Please complete the following information -->

#### Browser/Device Information
- **OS**: [e.g. macOS 13.0, Windows 11, Ubuntu 22.04]
- **Browser**: [e.g. Chrome 118, Firefox 119, Safari 17]
- **Device**: [e.g. Desktop, iPhone 14, Samsung Galaxy S23]
- **Screen Resolution**: [e.g. 1920x1080, 375x812]
- **Viewport Size**: [if relevant]

#### Project Information
- **Next.js Version**: [e.g. 14.0.0]
- **Node.js Version**: [e.g. 18.17.0]
- **Package Manager**: [e.g. npm 9.8.1, yarn 1.22.19, pnpm 8.7.0]
- **Build Target**: [e.g. server, static export, edge runtime]
- **Deployment Platform**: [e.g. Vercel, Netlify, self-hosted]

#### Dependencies (if relevant)
<!-- List relevant package versions -->
```json
{
  "react": "18.2.0",
  "tailwindcss": "3.3.0",
  // ... other relevant packages
}
```

### Code Snippets
<!-- If applicable, add code snippets that reproduce the issue -->

#### Minimal Reproduction
```jsx
// Provide a minimal code example that reproduces the issue
```

#### Configuration Files
<!-- Include relevant config files if the issue is configuration-related -->

<details>
<summary>next.config.js</summary>

```javascript
// Your next.config.js content
```

</details>

<details>
<summary>package.json</summary>

```json
{
  "relevant": "dependencies and scripts"
}
```

</details>

### Error Messages/Logs
<!-- Include any error messages or console logs -->

#### Browser Console
```
// Browser console errors
```

#### Server Logs
```
// Server-side errors or build logs
```

#### Build Output
```
// Build errors or warnings
```

### Reproduction Repository
<!-- Provide a link to a minimal reproduction repository -->
- **Repository URL**:
- **Branch**:
- **Instructions**:

### Related Issues
<!-- Link any related issues or discussions -->
- Related to #
- Duplicate of #
- Similar to #

### Impact Assessment
<!-- Help us understand the severity -->
- [ ] Critical - Blocks core functionality
- [ ] High - Major feature broken
- [ ] Medium - Minor feature affected
- [ ] Low - Cosmetic issue

#### User Impact
- **Affected Users**: [e.g. All users, Mobile users only, Users with X feature enabled]
- **Frequency**: [e.g. Always, Sometimes, Rarely]
- **Workaround Available**: [Yes/No - describe if yes]

### Regression Information
<!-- If this worked before -->
- [ ] This is a regression (it used to work)
- **Last Working Version**: [if known]
- **First Broken Version**: [if known]

### Additional Context
<!-- Add any other context about the problem here -->

#### What I've Tried
- [ ] Cleared browser cache
- [ ] Tried in incognito/private mode
- [ ] Tested on different browser
- [ ] Checked browser extensions
- [ ] Restarted development server
- [ ] Deleted node_modules and reinstalled
- [ ] Checked network requests in DevTools
- [ ] Others: please specify it here (if applicable)

#### Potential Cause
<!-- If you have any ideas about what might be causing this -->


### Checklist
<!-- Please check all that apply -->
- [ ] I have searched existing issues to avoid duplicates
- [ ] I have provided a clear and descriptive title
- [ ] I have included all relevant environment information
- [ ] I have provided steps to reproduce the issue
- [ ] I have included error messages/logs if applicable
- [ ] I have tested this on the latest version
- [ ] I am willing to help test a fix
