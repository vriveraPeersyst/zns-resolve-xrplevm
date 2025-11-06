# Contributing to XRPL EVM Transfer DApp

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/zns-resolve-xrplevm.git
   cd zns-resolve-xrplevm
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5089`.

### Code Style

- Follow the existing code style
- Use TypeScript for type safety
- Write meaningful commit messages
- Keep functions small and focused
- Add comments for complex logic

### Testing Your Changes

1. Test the app in your browser
2. Verify MetaMask integration works
3. Test .xrpl domain resolution
4. Test transfers on XRPL EVM Mainnet (with small amounts)
5. Check mobile responsiveness

### Building

```bash
npm run build
```

Ensure the build completes without errors.

## Pull Request Process

1. **Update documentation** if needed (README, code comments)
2. **Test thoroughly** on XRPL EVM Mainnet
3. **Create a Pull Request** with:
   - Clear title describing the change
   - Description of what was changed and why
   - Screenshots for UI changes
   - Any breaking changes noted

4. **Respond to feedback** from reviewers
5. **Squash commits** if requested before merge

## Code Guidelines

### TypeScript

- Use strict TypeScript types
- Avoid `any` type when possible
- Export types for reusable components

### React Components

- Use functional components
- Use hooks for state management
- Keep components focused on one responsibility
- Extract reusable logic into custom hooks

### Styling

- Use Tailwind CSS utility classes
- Follow the existing design system
- Ensure responsive design (mobile-first)

### Blockchain Integration

- Handle errors gracefully
- Validate user inputs
- Check for MetaMask presence
- Verify correct network
- Don't store private keys or sensitive data

## Reporting Issues

- Use GitHub Issues
- Provide clear reproduction steps
- Include browser and MetaMask version
- Include screenshots if applicable
- Tag issues appropriately

## Feature Requests

- Open a GitHub Issue
- Describe the feature clearly
- Explain the use case
- Be open to discussion

## Security

- Never commit private keys or secrets
- Report security vulnerabilities privately
- Follow Web3 security best practices

## Questions?

Feel free to open an issue for questions or clarifications.

Thank you for contributing! 🎉
