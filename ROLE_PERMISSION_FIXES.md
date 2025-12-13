# 🔧 Perbaikan Sistem Roles & Permissions

## 📋 Masalah yang Ditemukan & Diperbaiki

### 1. **Hardcoded Role IDs**
**Masalah:**
- Role ID `1320620623369867385` (staff) hardcoded di beberapa file
- Role ID `1062374982778376192` (custom role position) hardcoded di cusrole.js

**Perbaikan:**
- ✅ Menggunakan `config.roles.staff` dengan fallback ke `config.staffRoleId`
- ✅ Menambahkan `config.roles.customRolePosition` untuk role position reference
- ✅ Update `.env.example` dengan `CUSTOM_ROLE_POSITION_REF`

### 2. **Inkonsistensi Permission Checks**
**Masalah:**
- Beberapa command menggunakan `Administrator` permission
- Beberapa menggunakan `ManageGuild`
- Beberapa menggunakan `ManageMessages`
- Tidak ada standar yang konsisten

**Perbaikan:**
- ✅ Membuat `util/rolePermissions.js` untuk standardisasi
- ✅ Implementasi hierarki permission yang jelas
- ✅ Pesan error yang konsisten untuk semua command

### 3. **Duplikasi Konfigurasi**
**Masalah:**
- Field deprecated dan baru di config.js
- `staffRoleId` vs `roles.staff`

**Perbaikan:**
- ✅ Menggunakan `config.roles.*` sebagai primary
- ✅ Mempertahankan backward compatibility dengan field lama
- ✅ Dokumentasi yang jelas tentang field mana yang harus digunakan

## 🆕 Fitur Baru yang Ditambahkan

### 1. **RolePermissions Utility Class**
```javascript
const rolePermissions = require('../util/rolePermissions');

// Simple permission check
const permissionError = rolePermissions.checkPermission(message.member, 'admin');
if (permissionError) {
    return message.reply(permissionError);
}
```

### 2. **Hierarki Permission yang Jelas**
1. **Owner** - Akses penuh
2. **Admin** - Manage economy, shop, server settings
3. **Staff** - Manage tickets, giveaways, moderation
4. **Moderator** - Basic moderation, warnings
5. **Support Team** - Ticket support
6. **Event Organizer** - Giveaway management

### 3. **Permission Categories**
- `admin` - Administrator permissions
- `staff` - Staff permissions
- `moderator` - Moderator permissions
- `economy` - Economy management
- `giveaway` - Giveaway management
- `ticket` - Ticket management
- `shop` - Shop management
- `customRole` - Custom role creation

## 📝 Files yang Diperbarui

### Commands Updated:
- ✅ `commands/admin/addxp.js` - Menggunakan rolePermissions.checkPermission('economy')
- ✅ `commands/admin/reset.js` - Menggunakan rolePermissions.checkPermission('admin')
- ✅ `commands/moderator/warn.js` - Menggunakan rolePermissions.checkPermission('moderator')
- ✅ `commands/moderator/trollban.js` - Fix hardcoded role ID
- ✅ `commands/giveaway/start.js` - Menggunakan rolePermissions.checkPermission('giveaway')
- ✅ `commands/ticket/close.js` - Menggunakan rolePermissions.checkPermission('ticket')
- ✅ `commands/shop/addshop.js` - Menggunakan rolePermissions.checkPermission('shop')
- ✅ `commands/cusrole/cusrole.js` - Fix hardcoded role position ID
- ✅ `commands/test/testafk.js` - Menggunakan rolePermissions.checkPermission('admin')
- ✅ `commands/test/debugticket.js` - Menggunakan rolePermissions.checkPermission('admin')

### Configuration Files:
- ✅ `config.js` - Menambahkan `roles.customRolePosition` dan `features.customRolePositionRef`
- ✅ `.env.example` - Menambahkan `CUSTOM_ROLE_POSITION_REF`

### New Files:
- ✅ `util/rolePermissions.js` - Utility class untuk permission management
- ✅ `PERMISSIONS.md` - Dokumentasi lengkap sistem permission
- ✅ `ROLE_PERMISSION_FIXES.md` - Summary perbaikan ini

## 🔄 Migration Guide

### Untuk Developer:
1. **Gunakan rolePermissions utility** untuk semua permission checks baru
2. **Jangan hardcode role IDs** lagi dalam command files
3. **Gunakan config.roles** untuk semua role references
4. **Test permission changes** sebelum deploy

### Untuk Server Admin:
1. **Update .env file** dengan role IDs yang benar:
```env
STAFF_ROLE_ID=your_staff_role_id
ADMIN_ROLE_ID=your_admin_role_id
MODERATOR_ROLE_ID=your_moderator_role_id
CUSTOM_ROLE_POSITION_REF=your_reference_role_id
```

2. **Restart bot** setelah update konfigurasi
3. **Test commands** untuk memastikan permission bekerja dengan benar

## 🚨 Breaking Changes

### None! 
Semua perubahan backward compatible. Field lama masih didukung:
- `config.staffRoleId` → `config.roles.staff`
- Hardcoded IDs masih ada sebagai fallback

## 🔮 Rekomendasi Selanjutnya

### 1. **Update Remaining Commands**
Masih ada beberapa command yang belum diupdate:
- Commands di folder `shop/` lainnya
- Commands di folder `economy/`
- Commands di folder `test/` lainnya

### 2. **Enhanced Permission System**
- Role-based command cooldowns
- Permission audit logging
- Dynamic permission assignment
- Web dashboard untuk role management

### 3. **Database Migration**
- Simpan permission history
- User permission cache
- Role change notifications

## ✅ Testing Checklist

- [ ] Test admin commands dengan role Admin
- [ ] Test staff commands dengan role Staff  
- [ ] Test moderator commands dengan role Moderator
- [ ] Test custom role commands dengan Boost/Donate role
- [ ] Test permission denied messages
- [ ] Test backward compatibility dengan config lama
- [ ] Test bot restart dengan konfigurasi baru

## 📞 Support

Jika ada masalah dengan sistem permission baru:
1. Cek console untuk error messages
2. Verifikasi role IDs di .env file
3. Test dengan command `debugticket` untuk melihat konfigurasi
4. Pastikan bot memiliki permission yang diperlukan di Discord

---

**Status:** ✅ **COMPLETED**  
**Tested:** ⏳ **PENDING**  
**Deployed:** ⏳ **PENDING**