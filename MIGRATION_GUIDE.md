# Migration Guide - Hardcoded IDs to Config

This guide helps you migrate from hardcoded IDs to the new centralized configuration system.

## 🎯 What Changed?

All hardcoded Discord IDs (channels, roles, categories, emojis) have been moved to environment variables and `config.js`.

## ⚠️ Breaking Changes

If you're upgrading from an older version, you **MUST** update your `.env` file with the new variables.

---

## 📝 Migration Steps

### Step 1: Backup Current Configuration

Before migrating, note down all your current IDs from the old `config.js`:

```javascript
// OLD config.js (example)
welcomeChannelId: "1376956791757209773"
staffRoleId: "1376956790755037274"
// etc...
```

### Step 2: Copy New Environment Template

```bash
cp .env.example .env
```

### Step 3: Fill in Your IDs

Transfer your IDs to the new `.env` format:

```env
# OLD: welcomeChannelId in config.js
# NEW: WELCOME_CHANNEL_ID in .env
WELCOME_CHANNEL_ID=1376956791757209773

# OLD: staffRoleId in config.js
# NEW: STAFF_ROLE_ID in .env
STAFF_ROLE_ID=1376956790755037274
```

### Step 4: Update Level Roles

If you had level roles in `util/roleUtils.js`:

```javascript
// OLD: util/roleUtils.js
const LEVEL_ROLES = {
    10: '1372855014607028304',
    20: '1372855062526951425',
    // ...
};
```

Move to `.env`:

```env
# NEW: .env
LEVEL_10_ROLE_ID=1372855014607028304
LEVEL_20_ROLE_ID=1372855062526951425
```

### Step 5: Configure Custom Emojis

If you used custom emojis, add them to `.env`:

```env
EMOJI_SOULS=<:souls:1373202161823121560>
EMOJI_DOT=<:dot:1373230999793696788>
EMOJI_BLANK=<:blank:1297498366305107970>
```

### Step 6: Test Configuration

```bash
npm start
```

Check console for any configuration errors.

---

## 🔄 Variable Mapping

### Channels

| Old Variable | New Variable |
|-------------|-------------|
| `welcomeChannelId` | `WELCOME_CHANNEL_ID` |
| `welcome2ChannelId` | `WELCOME2_CHANNEL_ID` |
| `welcomeLogChannelId` | `WELCOME_LOG_CHANNEL_ID` |
| `boostAnnounceChannelId` | `BOOST_ANNOUNCE_CHANNEL_ID` |
| `boostLogsChannelId` | `BOOST_LOGS_CHANNEL_ID` |
| `ticket_logs` | `TICKET_LOG_CHANNEL_ID` |
| `customRoleLogsChannelId` | `CUSTOM_ROLE_LOGS_CHANNEL_ID` |
| Hardcoded in `introHandler.js` | `INTRO_CHANNEL_ID` |
| Hardcoded in `index.js` | `DONATION_CHANNEL_ID` |

### Categories

| Old Variable | New Variable |
|-------------|-------------|
| `ticket_category` | `TICKET_CATEGORY_ID` |
| `ticketCategoryId` | `TICKET_CATEGORY_ID` |
| Hardcoded in `partnerHandler.js` | `PARTNER_CATEGORY_ID` |

### Roles

| Old Variable | New Variable |
|-------------|-------------|
| `staffRoleId` | `STAFF_ROLE_ID` |
| `support_team` | `SUPPORT_TEAM_ROLE_ID` |
| `welcomeBotRoleId` | `WELCOME_BOT_ROLE_ID` |
| `BOOST_ROLE_ID` | `BOOST_ROLE_ID` |
| `DONATE_ROLE_ID` | `DONATE_ROLE_ID` |

### Level Roles

| Old Location | New Variable |
|-------------|-------------|
| `util/roleUtils.js` level 10 | `LEVEL_10_ROLE_ID` |
| `util/roleUtils.js` level 20 | `LEVEL_20_ROLE_ID` |
| `util/roleUtils.js` level 30 | `LEVEL_30_ROLE_ID` |
| `util/roleUtils.js` level 40 | `LEVEL_40_ROLE_ID` |
| `util/roleUtils.js` level 50 | `LEVEL_50_ROLE_ID` |

### Emojis

| Old Location | New Variable |
|-------------|-------------|
| Hardcoded `<:souls:...>` | `EMOJI_SOULS` |
| Hardcoded `<:dot:...>` | `EMOJI_DOT` |
| Hardcoded `<:blank:...>` | `EMOJI_BLANK` |
| Hardcoded `<:seraphyx:...>` | `EMOJI_SERAPHYX` |
| Hardcoded `<a:important:...>` | `EMOJI_IMPORTANT` |
| Hardcoded `<:question:...>` | `EMOJI_QUESTION` |
| Hardcoded `<:report:...>` | `EMOJI_REPORT` |
| Hardcoded `<:ban:...>` | `EMOJI_BAN` |
| Hardcoded `<:partner:...>` | `EMOJI_PARTNER` |

### Images

| Old Location | New Variable |
|-------------|-------------|
| Hardcoded in `shopHandler.js` | `DEFAULT_GIF_URL` |

---

## ✅ Verification Checklist

After migration, verify:

- [ ] Bot starts without errors
- [ ] Welcome messages work
- [ ] Ticket system creates channels
- [ ] Level roles are assigned correctly
- [ ] Shop displays with correct emojis
- [ ] Custom emojis show properly
- [ ] Donation notifications work
- [ ] Introduction system works
- [ ] Partner tickets work

---

## 🐛 Common Issues

### Issue: Bot starts but features don't work

**Solution**: Check that all required channel/role IDs are set in `.env`

### Issue: Emojis show as text

**Solution**: 
1. Verify emoji IDs are correct
2. Ensure bot is in server with those emojis
3. Check emoji format: `<:name:id>` or `<a:name:id>`

### Issue: Level roles not working

**Solution**: 
1. Check `LEVEL_XX_ROLE_ID` variables are set
2. Verify role IDs exist in your server
3. Ensure bot has permission to manage roles

### Issue: Channels not found

**Solution**:
1. Verify channel IDs are correct
2. Check bot has access to channels
3. Ensure IDs are from the correct server

---

## 💡 Benefits of New System

1. **Security**: No sensitive IDs in code
2. **Flexibility**: Easy to change without code edits
3. **Multi-Server**: Different configs per deployment
4. **Maintainability**: Centralized configuration
5. **Best Practice**: Industry standard approach

---

## 🔙 Rollback (If Needed)

If you need to rollback:

1. Restore old `config.js` from backup
2. Restore old `util/roleUtils.js`
3. Restore old handler files
4. Use git to revert: `git checkout <old-commit>`

---

## 📞 Need Help?

- Check [CONFIGURATION.md](CONFIGURATION.md) for detailed config guide
- Open an issue on GitHub
- Review console logs for specific errors

---

## 🎉 You're Done!

Your bot now uses centralized configuration. Enjoy easier management and better security!
