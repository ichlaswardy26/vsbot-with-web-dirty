# Contributing to Villain Seraphyx Manager Bot

Thank you for considering contributing to this project! Here are some guidelines to help you get started.

## 🚀 Getting Started

### Prerequisites
- Node.js v18.0.0 or higher
- MongoDB database
- Discord Bot Token
- Git

### Setup Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/villain-seraphyx-bot.git
   cd villain-seraphyx-bot
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy environment file:
   ```bash
   cp .env.example .env
   ```
5. Configure your `.env` file with test credentials
6. Run the bot in development mode:
   ```bash
   npm run dev
   ```

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/bank-system`)
- `fix/` - Bug fixes (e.g., `fix/xp-calculation`)
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

## 📝 Code Style

### General Guidelines
- Use consistent indentation (2 spaces)
- Follow existing code patterns
- Add JSDoc comments for functions
- Use meaningful variable and function names
- Keep functions small and focused (< 50 lines)
- Use async/await instead of callbacks

### JavaScript Style
```javascript
// Good
async function getUserBalance(userId, guildId) {
    const economy = await Economy.findOne({ userId, guildId });
    return economy?.cash || 0;
}

// Bad
function getUserBalance(userId, guildId, callback) {
    Economy.findOne({ userId, guildId }, function(err, economy) {
        callback(err, economy ? economy.cash : 0);
    });
}
```

### Command Structure
```javascript
module.exports = {
    name: 'commandname',
    aliases: ['alias1', 'alias2'],
    description: 'What the command does',
    category: 'category',
    usage: 'commandname <required> [optional]',
    examples: ['commandname example1', 'commandname example2'],
    permissions: ['RequiredPermission'], // Optional
    cooldown: 3000, // Optional, in ms
    
    async exec(client, message, args) {
        // Command logic here
    }
};
```

### Schema Structure
```javascript
const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    // ... other fields
}, { timestamps: true });

// Add compound index
exampleSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Example', exampleSchema);
```

## 🗂️ Project Structure

```
├── commands/           # Command modules by category
│   ├── actions/       # Fun interaction commands
│   ├── admin/         # Administrative commands
│   ├── economy/       # Economy system commands
│   ├── level/         # Leveling commands
│   ├── moderator/     # Moderation commands
│   └── ...
├── events/            # Discord event handlers
│   ├── client/        # Client events
│   └── guild/         # Guild events
├── handlers/          # Feature handlers
├── schemas/           # MongoDB models
├── util/              # Utility functions
├── web/               # Web dashboard
│   ├── middleware/    # Express middleware
│   ├── routes/        # API routes
│   ├── services/      # Backend services
│   └── public/        # Static files
├── tests/             # Test files
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
├── locales/           # Language files
└── docs/              # Documentation
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Writing Tests
```javascript
describe('FeatureName', () => {
    beforeEach(() => {
        // Setup
    });

    it('should do something', async () => {
        // Test logic
        expect(result).toBe(expected);
    });
});
```

### Test Coverage Requirements
- Minimum 50% coverage for new code
- All utility functions should have tests
- Critical paths must be tested

## ✅ Before Submitting

### Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console errors
- [ ] Documentation updated if needed
- [ ] Commit messages are clear
- [ ] PR description explains changes

### Commit Message Format
```
type: short description

Longer description if needed.

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Error messages and stack traces
- Environment details:
  - Node.js version
  - Operating system
  - Bot version

### Bug Report Template
```markdown
**Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen.

**Actual Behavior**
What actually happens.

**Environment**
- Node.js: v18.x
- OS: Windows/Linux/macOS
- Bot Version: 1.2.0
```

## 💡 Feature Requests

For feature requests, please describe:
- The feature you'd like to see
- Why it would be useful
- How it should work
- Any examples or mockups

### Feature Request Template
```markdown
**Feature Description**
A clear description of the feature.

**Use Case**
Why this feature would be useful.

**Proposed Implementation**
How you think it should work.

**Alternatives Considered**
Other solutions you've thought about.
```

## 📋 Pull Request Guidelines

### PR Checklist
- [ ] PR title follows format: `type: description`
- [ ] PR description explains what and why
- [ ] Related issues are linked
- [ ] Tests are included for new features
- [ ] Documentation is updated
- [ ] No merge conflicts

### PR Template
```markdown
## Description
What does this PR do?

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Related Issues
Fixes #123
```

## 🌐 Internationalization (i18n)

When adding user-facing strings:

1. Add to `locales/id.json` (Indonesian - default)
2. Add to `locales/en.json` (English)
3. Use the i18n manager:
```javascript
const i18n = require('../../util/i18nManager');
const message = i18n.t('category.key', { userId, guildId, vars: { name: 'value' } });
```

## 🤝 Code of Conduct

- Be respectful and constructive
- Welcome newcomers and help them learn
- Focus on the code, not the person
- Accept constructive criticism gracefully
- No harassment, discrimination, or offensive behavior

## 📞 Getting Help

- Open an issue for questions
- Join our Discord server
- Check existing issues and documentation
- Tag maintainers if urgent

## 🏆 Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Given appropriate credit in code comments

Thank you for contributing! 🎉
