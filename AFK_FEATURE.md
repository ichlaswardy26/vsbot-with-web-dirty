# 💤 AFK Feature - Anna Manager Bot

Fitur AFK (Away From Keyboard) yang telah diperbaiki dan ditingkatkan.

## ✨ Fitur yang Diperbaiki

### 1. ✅ Set AFK Status
- Command: `sera afk [alasan]`
- Menampilkan embed yang informatif
- Otomatis menambah prefix `[AFK]` ke nickname (jika bot punya permission)
- Menyimpan nickname asli untuk dikembalikan nanti

### 2. ✅ Auto Remove AFK
- Ketika user yang AFK mengirim pesan apapun, status AFK otomatis dibatalkan
- Nickname dikembalikan ke nama asli
- Menampilkan durasi AFK
- **PERBAIKAN**: Pesan tetap diproses normal (command, XP, dll tidak terblokir)

### 3. ✅ Mention AFK User
- Ketika ada yang mention user yang sedang AFK
- Bot akan menampilkan embed informatif dengan:
  - Alasan AFK
  - Waktu sejak AFK (relative time)
  - Durasi AFK (detail)
  - Avatar user yang AFK

## 📋 Cara Menggunakan

### Set AFK
```
sera afk Makan siang
sera afk Tidur
sera afk Meeting
sera afk
```

### Batal AFK
Cukup kirim pesan apapun di channel manapun, status AFK otomatis dibatalkan.

### Cek User AFK
Mention user yang sedang AFK, bot akan menampilkan informasi AFK mereka.

## 🎨 Tampilan

### Set AFK
```
┌─────────────────────────────────┐
│ 💤 Status AFK Diaktifkan        │
├─────────────────────────────────┤
│ @User sekarang sedang AFK       │
│                                 │
│ 📝 Alasan: Makan siang          │
│ ⏰ Waktu: 14:30 WIB             │
│ 🏷️ Nickname: ✅ Diubah ke [AFK] │
└─────────────────────────────────┘
```

### Mention AFK User
```
┌─────────────────────────────────┐
│ 💤 User Sedang AFK              │
├─────────────────────────────────┤
│ @User sedang tidak aktif        │
│                                 │
│ 📝 Alasan: Makan siang          │
│ ⏰ Sejak: 30 menit yang lalu    │
│ ⌛ Durasi: 30 menit              │
└─────────────────────────────────┘
```

### Batal AFK
```
✅ Selamat datang kembali, User!
Status AFK Anda telah dicabut.
Waktu AFK: 30 menit
```

## 🔧 Technical Details

### Global Storage
```javascript
global.afkUsers = new Map();
// Structure:
{
  userId: {
    reason: string,
    timestamp: number,
    originalNickname: string | null
  }
}
```

### Flow

#### Set AFK
1. User menjalankan command `sera afk [alasan]`
2. Bot cek apakah user sudah AFK
3. Jika belum, simpan data AFK ke `global.afkUsers`
4. Coba ubah nickname dengan prefix `[AFK]`
5. Kirim embed konfirmasi

#### Auto Remove AFK
1. User yang AFK mengirim pesan
2. Bot deteksi user ada di `global.afkUsers`
3. Hapus dari `global.afkUsers`
4. Kembalikan nickname asli
5. Kirim pesan welcome back
6. **Lanjutkan proses pesan normal** (tidak di-return)

#### Mention AFK User
1. Ada user mention user lain
2. Bot cek apakah user yang di-mention ada di `global.afkUsers`
3. Jika ada, ambil data AFK
4. Hitung durasi AFK
5. Kirim embed informasi AFK

## 🐛 Bug Fixes

### Before
- ❌ User yang AFK tidak bisa mengirim command
- ❌ XP tidak dihitung saat user batal AFK
- ❌ Pesan tidak diproses karena `return;` setelah batal AFK
- ❌ Tampilan mention AFK kurang informatif

### After
- ✅ User yang AFK bisa mengirim command dan pesan normal
- ✅ XP tetap dihitung saat user batal AFK
- ✅ Pesan diproses normal setelah batal AFK
- ✅ Tampilan mention AFK dengan embed yang informatif

## 🎯 Features

- ✅ Set AFK dengan alasan custom
- ✅ Auto prefix `[AFK]` di nickname
- ✅ Auto remove AFK saat kirim pesan
- ✅ Kembalikan nickname asli
- ✅ Informasi AFK saat di-mention
- ✅ Durasi AFK yang akurat
- ✅ Embed yang informatif dan menarik
- ✅ Tidak mengganggu fitur bot lainnya

## 📊 Integration

Fitur AFK terintegrasi dengan:
- ✅ Command system (tidak terblokir)
- ✅ XP system (tetap dapat XP)
- ✅ Level system (tetap dapat level)
- ✅ Message events (tetap diproses)
- ✅ Nickname management (auto restore)

## 🔒 Permissions

Bot memerlukan permission:
- `MANAGE_NICKNAMES` - Untuk mengubah nickname user

Jika bot tidak punya permission:
- Status AFK tetap berfungsi
- Nickname tidak diubah
- Informasi tetap ditampilkan

## 💡 Tips

1. **Alasan AFK**: Berikan alasan yang jelas agar orang lain tahu
2. **Batal AFK**: Cukup kirim pesan apapun, tidak perlu command khusus
3. **Nickname**: Jika nickname tidak berubah, cek permission bot
4. **Durasi**: Durasi AFK dihitung otomatis dan akurat

## 🚀 Future Improvements

- [ ] Persistent AFK (simpan ke database)
- [ ] AFK history
- [ ] Custom AFK message
- [ ] AFK statistics
- [ ] Auto AFK after inactivity
- [ ] DM notification saat di-mention

---

Made with ❤️ for Anna Manager Bot
