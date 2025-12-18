# 📖 Command Documentation

Complete command reference for Villain Seraphyx Bot.

## Table of Contents

- [Action Commands](#-action-commands)
- [Admin Commands](#-admin-commands)
- [Economy Commands](#-economy-commands)
- [Level Commands](#-level-commands)
- [Shop Commands](#-shop-commands)
- [Moderation Commands](#-moderation-commands)
- [Ticket Commands](#-ticket-commands)
- [Voice Commands](#-voice-commands)
- [Giveaway Commands](#-giveaway-commands)
- [Utility Commands](#-utility-commands)
- [Mini Games](#-mini-games)

---

## 🎭 Action Commands

Fun interaction commands with anime GIFs.

| Command | Description | Usage |
|---------|-------------|-------|
| `bite` | Bite someone | `sera bite @user` |
| `cringe` | Show cringe reaction | `sera cringe` |
| `cry` | Cry reaction | `sera cry` |
| `cuddle` | Cuddle someone | `sera cuddle @user` |
| `dance` | Dance animation | `sera dance` |
| `hug` | Hug someone | `sera hug @user` |
| `kick` | Playfully kick someone | `sera kick @user` |
| `kill` | Playfully eliminate someone | `sera kill @user` |
| `kiss` | Kiss someone | `sera kiss @user` |
| `pat` | Pat someone's head | `sera pat @user` |
| `poke` | Poke someone | `sera poke @user` |
| `slap` | Slap someone | `sera slap @user` |
| `wave` | Wave at someone | `sera wave @user` |

---

## 👑 Admin Commands

Administrative commands requiring special permissions.

### `addxp`
Add XP to a user.
```
sera addxp @user <amount>
```
**Permission:** Administrator

### `resetxp`
Reset user's XP to zero.
```
sera resetxp @user
```
**Permission:** Administrator

### `boost`
Toggle XP boost for a user.
```
sera boost @user
```
**Permission:** Administrator

### `levelrewards`
Manage automatic role rewards for levels.
```
sera levelrewards list
sera levelrewards add <level> @role [souls_bonus]
sera levelrewards remove <level>
```
**Permission:** Administrator

### `auditlog`
View moderation and admin audit logs.
```
sera auditlog
sera auditlog @user
sera auditlog stats
sera auditlog WARN
```
**Permission:** Administrator

### `validateconfig`
Validate bot configuration.
```
sera validateconfig
```
**Permission:** Administrator

---

## 💰 Economy Commands

Virtual currency (souls) management.

### `balance` / `bal`
Check souls balance.
```
sera bal
sera bal @user
```

### `daily`
Claim daily souls reward.
```
sera daily
```
**Cooldown:** 24 hours

### `collect`
Collect periodic souls bonus.
```
sera collect
```
**Cooldown:** 1 hour

### `bank`
Manage your bank account.
```
sera bank                    # View bank info
sera bank deposit <amount>   # Deposit souls
sera bank deposit all        # Deposit all
sera bank withdraw <amount>  # Withdraw souls
sera bank interest           # Collect interest
sera bank upgrade            # Upgrade capacity
sera bank history            # View transactions
```

### `resetsouls`
Reset user's souls balance.
```
sera resetsouls @user
```
**Permission:** Administrator

### `addbalance`
Add souls to a user.
```
sera addbalance @user <amount>
```
**Permission:** Administrator

---

## 📊 Level Commands

XP and leveling system commands.

### `rank`
View user's rank card.
```
sera rank
sera rank @user
```

### `leaderboard` / `lb`
View server XP leaderboard.
```
sera leaderboard
sera lb
```

### `booststatus`
Check current XP boost status.
```
sera booststatus
```

### `voiceevent`
View voice activity events.
```
sera voiceevent
```

---

## 🛒 Shop Commands

Shop and item management.

### `shop`
Browse available items.
```
sera shop
```

### `buy`
Purchase an item.
```
sera buy <item_id>
```

### `purchases`
View purchase history.
```
sera purchases
sera purchases @user
```

### `addshop`
Add item to shop.
```
sera addshop
```
**Permission:** Administrator

### `removeshop`
Remove item from shop.
```
sera removeshop <item_id>
```
**Permission:** Administrator

### `addexclusive`
Add exclusive limited item.
```
sera addexclusive
```
**Permission:** Administrator

### `buyer`
View item buyers.
```
sera buyer <item_id>
```
**Permission:** Staff

### `done`
Mark purchase as completed.
```
sera done <purchase_id>
```
**Permission:** Staff

---

## 🛡️ Moderation Commands

Server moderation tools.

### `warn`
Issue a warning to a user.
```
sera warn @user <reason>
```
**Permission:** Moderator

### `snipe`
Show recently deleted message.
```
sera snipe
```

### `trollban`
Fun troll ban command (not real).
```
sera ban @user
```

---

## 🎫 Ticket Commands

Support ticket system.

### `ticket`
Create a support ticket.
```
sera ticket
```

### `close`
Close current ticket.
```
sera close
```

---

## 🔊 Voice Commands

Voice channel management.

### `voice`
Manage your voice channel.
```
sera voice name <new_name>     # Change name
sera voice limit <number>      # Set user limit
sera voice lock                # Lock channel
sera voice unlock              # Unlock channel
sera voice hide                # Hide channel
sera voice unhide              # Show channel
sera voice kick @user          # Kick user
sera voice ban @user           # Ban user
sera voice unban @user         # Unban user
sera voice trust @user         # Add trusted user
sera voice untrust @user       # Remove trusted user
sera voice bitrate <kbps>      # Set bitrate
```

### `claim`
Claim ownership of voice channel.
```
sera claim
```

---

## 🎁 Giveaway Commands

Giveaway management.

### `giveaway`
Start a new giveaway.
```
sera giveaway
```
**Permission:** Staff

### `giveaway-end`
End a giveaway early.
```
sera giveaway-end <message_id>
```
**Permission:** Staff

### `giveaway-reroll`
Reroll giveaway winner.
```
sera giveaway-reroll <message_id>
```
**Permission:** Staff

---

## 🔧 Utility Commands

General utility commands.

### `ping`
Check bot latency.
```
sera ping
```

### `info`
Display bot information.
```
sera info
```

### `avatar`
Display user's avatar.
```
sera avatar
sera avatar @user
```

### `afk`
Set AFK status.
```
sera afk
sera afk <reason>
```

### `say`
Make the bot say something.
```
sera say <message>
```
**Permission:** Staff

### `createembed`
Create custom embed.
```
sera createembed
```
**Permission:** Staff

### `language`
Change bot language.
```
sera language              # Show language menu
sera language en           # Set to English
sera language id           # Set to Indonesian
sera language en server    # Set server language (Admin)
```

### `confess`
Send anonymous confession.
```
sera confess
```

---

## 🎮 Mini Games

Interactive games.

### `wordchain`
Word chain game.
```
sera wordchain
```

### `caklontong`
Indonesian riddle game.
```
sera caklontong
```

### `guesstheanimal`
Animal guessing game.
```
sera guesstheanimal
```

### `tebakgambar`
Image guessing game.
```
sera tebakgambar
```

---

## Auto Responder

### `addres`
Add auto response.
```
sera addres
```
**Permission:** Administrator

### `delres`
Delete auto response.
```
sera delres <id>
```
**Permission:** Administrator

### `listres`
List all auto responses.
```
sera listres
```

---

## Custom Roles

### `cusrole` / `cr`
Manage custom roles.
```
sera cr create <name> <color>  # Create role
sera cr edit                   # Edit role
sera cr delete                 # Delete role
sera cr add @user              # Add user to role
sera cr remove @user           # Remove user
sera cr info                   # View role info
sera cr up                     # Move role up
```
**Requirement:** Boost or Donate role

---

## Information Commands

### `rinfo`
Role information.
```
sera rinfo
```

### `book`
Server information.
```
sera book
```

### `rules`
Server rules.
```
sera rules
```

### `support`
Support information.
```
sera support
```

### `partner`
Partnership information.
```
sera partner
```

### `event`
Current events.
```
sera event
```

---

## Permission Levels

| Level | Description |
|-------|-------------|
| Everyone | All users |
| Boost/Donate | Users with boost or donate role |
| Staff | Users with staff role |
| Moderator | Users with moderation permissions |
| Administrator | Users with admin permissions |
| Owner | Bot owners only |

---

## Cooldowns

| Category | Cooldown |
|----------|----------|
| General | 1 second |
| Economy | 3 seconds |
| Admin | 5 seconds |
| Giveaway | 10 seconds |
| Custom Role | 30 seconds |

---

## Rate Limits

| Category | Limit |
|----------|-------|
| Economy | 20/minute |
| Admin | 10/minute |
| Shop | 15/minute |
| Giveaway | 5/5 minutes |
| Custom Role | 3/hour |
