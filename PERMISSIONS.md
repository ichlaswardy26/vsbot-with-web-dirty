# 🔐 Sistem Permission & Roles

Dokumentasi lengkap tentang sistem permission dan roles yang digunakan dalam bot Villain Seraphyx Manager.

## 📋 Hierarki Permission

### 1. **Owner** (Tertinggi)
- User ID yang terdaftar di `OWNER_IDS` environment variable
- Memiliki akses penuh ke semua fitur bot
- Dapat menggunakan semua command tanpa batasan

### 2. **Admin**
- Role ID: `ADMIN_ROLE_ID`
- Permission Discord: `Administrator`
- Dapat mengelola:
  - Economy system (add/reset souls, XP)
  - Shop management
  - Server settings
  - All staff functions

### 3. **Staff**
- Role ID: `STAFF_ROLE_ID`
- Dapat mengelola:
  - Tickets (create, close)
  - Giveaways (start, end, reroll)
  - Moderation functions
  - Custom role management

### 4. **Moderator**
- Role ID: `MODERATOR_ROLE_ID`
- Permission Discord: `ManageMessages`, `KickMembers`, `BanMembers`
- Dapat mengelola:
  - Warnings
  - Basic moderation
  - Message management

### 5. **Support Team**
- Role ID: `SUPPORT_TEAM_ROLE_ID`
- Dapat mengelola:
  - Tickets
  - User support

### 6. **Event Organizer**
- Role ID: `EVENT_ORGANIZER_ROLE_ID`
- Dapat mengelola:
  - Giveaways
  - Events

## 🎯 Permission Categories

### Admin Commands
**Required:** Owner, Admin role, atau Administrator permission
- `addxp` - Menambah XP user
- `resetxp` - Reset XP user
- `reset` - Reset activity data
- `resetsouls` - Reset souls user
- Shop management commands
- Economy management

### Staff Commands
**Required:** Staff role atau lebih tinggi
- `close` - Menutup ticket
- `giveaway` - Memulai giveaway
- `trollban` - Fake ban command
- Ticket management

### Moderator Commands
**Required:** Moderator role, Staff role, atau moderation permissions
- `warn` - Memberikan warning
- `snipe` - Melihat pesan yang dihapus
- Basic moderation

### Special Role Commands
**Required:** Boost atau Donate role
- `cusrole` - Custom role management
- Custom role features

## 🔧 Konfigurasi Roles

### Environment Variables
```env
# Staff & Permission Roles
STAFF_ROLE_ID=your_staff_role_id
SUPPORT_TEAM_ROLE_ID=your_support_team_role_id

# Staff Hierarchy Roles
OWNER_ROLE_ID=your_owner_role_id
CO_OWNER_ROLE_ID=your_co_owner_role_id
ENGINEER_ROLE_ID=your_engineer_role_id
ADMIN_ROLE_ID=your_admin_role_id
MODERATOR_ROLE_ID=your_moderator_role_id
EVENT_ORGANIZER_ROLE_ID=your_event_organizer_role_id
PARTNER_MANAGER_ROLE_ID=your_partner_manager_role_id
DESIGNER_ROLE_ID=your_designer_role_id
HELPER_ROLE_ID=your_helper_role_id
CONTENT_CREATOR_ROLE_ID=your_content_creator_role_id

# Special Roles
BOOST_ROLE_ID=your_boost_role_id
DONATE_ROLE_ID=your_donate_role_id

# Custom Role Position Reference
CUSTOM_ROLE_POSITION_REF=your_reference_role_id
```

## 📚 Penggunaan dalam Code

### Menggunakan RolePermissions Utility

```javascript
const rolePermissions = require('../util/rolePermissions');

// Check specific permission
const permissionError = rolePermissions.checkPermission(message.member, 'admin');
if (permissionError) {
    return message.reply(permissionError);
}

// Manual checks
if (rolePermissions.isAdmin(message.member)) {
    // Admin-only code
}

if (rolePermissions.isStaff(message.member)) {
    // Staff-only code
}

if (rolePermissions.canManageGiveaways(message.member)) {
    // Giveaway management code
}
```

### Available Permission Types
- `admin` - Administrator permissions
- `staff` - Staff permissions
- `moderator` - Moderator permissions
- `economy` - Economy management
- `giveaway` - Giveaway management
- `ticket` - Ticket management
- `shop` - Shop management
- `customRole` - Custom role creation

## 🚨 Error Messages

Sistem akan memberikan pesan error yang konsisten:

- **Admin:** "❌ **|** Kamu memerlukan permission **Administrator** atau role **Admin** untuk menggunakan command ini."
- **Staff:** "❌ **|** Kamu memerlukan role **Staff** atau lebih tinggi untuk menggunakan command ini."
- **Moderator:** "❌ **|** Kamu memerlukan role **Moderator** atau permission moderation untuk menggunakan command ini."
- **Custom Role:** "❌ **|** Kamu memerlukan role **Boost** atau **Donate** untuk menggunakan command ini."

## 🔄 Migration dari Sistem Lama

### Deprecated Fields (Masih Didukung)
```javascript
// Old way (deprecated)
client.config.staffRoleId

// New way (recommended)
client.config.roles.staff
```

### Hardcoded IDs yang Diperbaiki
- `1320620623369867385` → `config.roles.staff`
- `1062374982778376192` → `config.roles.customRolePosition`

## 🛠️ Troubleshooting

### Command Tidak Berfungsi
1. Pastikan role ID sudah dikonfigurasi di `.env`
2. Cek apakah user memiliki role yang tepat
3. Verifikasi bot memiliki permission yang diperlukan
4. Cek console untuk error messages

### Permission Denied
1. Cek hierarki roles di Discord server
2. Pastikan role bot lebih tinggi dari role yang dikelola
3. Verifikasi permission bot di channel/server

### Custom Role Issues
1. Pastikan `CUSTOM_ROLE_POSITION_REF` sudah dikonfigurasi
2. Cek apakah user memiliki Boost atau Donate role
3. Verifikasi bot dapat manage roles

## 📝 Best Practices

1. **Selalu gunakan `rolePermissions.checkPermission()`** untuk consistency
2. **Jangan hardcode role IDs** dalam command files
3. **Gunakan config.roles** untuk semua role references
4. **Test permission changes** di development environment dulu
5. **Document custom permissions** jika menambah fitur baru

## 🔮 Future Improvements

- [ ] Role-based command cooldowns
- [ ] Dynamic permission assignment
- [ ] Permission audit logging
- [ ] Web dashboard untuk role management
- [ ] Advanced permission inheritance