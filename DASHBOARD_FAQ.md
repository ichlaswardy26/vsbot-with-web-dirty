# ❓ Dashboard FAQ - Anna Manager Bot

Frequently Asked Questions tentang dashboard.

## 🚀 Installation & Setup

### Q: Berapa lama waktu yang dibutuhkan untuk setup dashboard?
**A:** Sekitar **5-10 menit** jika Anda sudah familiar dengan Discord Developer Portal. Ikuti [QUICK_START_DASHBOARD.md](QUICK_START_DASHBOARD.md) untuk panduan cepat.

### Q: Apakah saya perlu database terpisah untuk dashboard?
**A:** **Tidak!** Dashboard menggunakan database MongoDB yang sama dengan bot. Ini memastikan data selalu sinkron.

### Q: Apakah dashboard bisa berjalan tanpa bot?
**A:** **Ya**, dashboard bisa berjalan independen. Namun, untuk fitur bot control (start/stop), bot harus running.

### Q: Apakah saya perlu hosting terpisah untuk dashboard?
**A:** **Tidak wajib**. Anda bisa run dashboard di komputer yang sama dengan bot. Untuk production, disarankan hosting terpisah.

---

## 🔐 Authentication & Security

### Q: Siapa saja yang bisa akses dashboard?
**A:** Hanya user dengan Discord ID yang ada di `ADMIN_IDS` di file `.env`. Ini memastikan hanya admin yang bisa akses.

### Q: Bagaimana cara menambah admin baru?
**A:** Edit file `dashboard/.env`, tambahkan Discord user ID ke `ADMIN_IDS`:
```env
ADMIN_IDS=123456789,987654321,111222333
```
Pisahkan dengan koma, tanpa spasi.

### Q: Apakah dashboard aman?
**A:** **Ya!** Dashboard menggunakan:
- Discord OAuth2 (no password)
- Session management
- Rate limiting
- Helmet.js security headers
- HTTPS ready

### Q: Bagaimana cara logout?
**A:** Klik tombol "Logout" di navbar (pojok kanan atas).

### Q: Session saya expired, kenapa?
**A:** Session expired setelah 7 hari untuk keamanan. Silakan login kembali.

---

## 🎨 Features & Functionality

### Q: Apakah perubahan di dashboard langsung terlihat di bot?
**A:** **Ya!** Dashboard dan bot menggunakan database yang sama, jadi perubahan langsung sinkron.

### Q: Apakah saya perlu restart bot setelah edit user/level?
**A:** **Tidak** untuk edit user/level. Bot akan otomatis load data terbaru dari database.

### Q: Apakah saya perlu restart bot setelah edit configuration?
**A:** **Ya** untuk configuration changes. Bot perlu restart untuk load `.env` file yang baru.

### Q: Bagaimana cara edit souls user?
**A:** 
1. Pergi ke **Users** page
2. Klik **Edit** pada user yang ingin diedit
3. Ubah nilai **Souls**
4. Klik **Save Changes**

### Q: Bagaimana cara delete user?
**A:**
1. Pergi ke **Users** page
2. Klik **Delete** pada user
3. Konfirmasi delete
4. User dan semua data terkait akan dihapus

### Q: Apakah data yang dihapus bisa dikembalikan?
**A:** **Tidak!** Delete bersifat permanent. Pastikan backup database sebelum delete data penting.

---

## 📊 Analytics & Monitoring

### Q: Seberapa sering data di dashboard diupdate?
**A:** 
- Bot status: setiap **5 detik**
- Statistics: setiap **10 detik**
- Real-time updates: **instant** via Socket.IO

### Q: Kenapa bot status menunjukkan offline padahal bot running?
**A:** Kemungkinan:
1. Dashboard dan bot tidak connect ke database yang sama
2. Bot crash atau error
3. Network issue
Check console log bot untuk error messages.

### Q: Apakah charts di analytics real-time?
**A:** Charts update setiap kali page di-refresh. Real-time charts akan ditambahkan di update mendatang.

---

## ⚙️ Configuration

### Q: Apa saja yang bisa dikonfigurasi via dashboard?
**A:** Hampir semua setting bot:
- Bot credentials
- Channel IDs
- Role IDs
- Feature settings (XP, economy, cooldowns)
- Embed colors

### Q: Apakah aman menyimpan bot token di dashboard?
**A:** Token disimpan di file `.env` yang **tidak** di-commit ke Git. Pastikan `.env` ada di `.gitignore`.

### Q: Bagaimana cara backup configuration?
**A:** Copy file `.env` ke lokasi aman. Atau export via dashboard (coming soon).

---

## 🐛 Troubleshooting

### Q: Error "Cannot find module"
**A:** Run `npm install` di folder dashboard:
```bash
cd dashboard
npm install
```

### Q: Error "Unauthorized" saat login
**A:** Pastikan Discord user ID Anda ada di `ADMIN_IDS` di file `.env`.

### Q: Error "Invalid redirect_uri"
**A:** 
1. Check `DISCORD_CALLBACK_URL` di `.env`
2. Pastikan sama dengan redirect URL di Discord Developer Portal
3. Format: `http://localhost:8080/auth/discord/callback`

### Q: Error "MongoDB connection failed"
**A:**
1. Check `MONGO_URI` di `.env`
2. Pastikan MongoDB cluster running
3. Test connection dengan MongoDB Compass
4. Check network/firewall

### Q: Error "Port already in use"
**A:**
1. Ganti `PORT` di `.env` (misal: 3001)
2. Update `DISCORD_CALLBACK_URL`
3. Update redirect URL di Discord Developer Portal

### Q: Dashboard tidak load styles (tampilan rusak)
**A:**
1. Check internet connection (Tailwind CSS dari CDN)
2. Clear browser cache
3. Check browser console untuk errors
4. Try different browser

### Q: Modal tidak muncul saat klik Edit
**A:**
1. Check browser console untuk JavaScript errors
2. Pastikan Socket.IO loaded
3. Clear browser cache
4. Try hard refresh (Ctrl+F5)

---

## 🌐 Deployment & Production

### Q: Bagaimana cara deploy dashboard ke production?
**A:** Lihat [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) section "Production Deployment". Support Heroku, VPS, dan cloud platforms.

### Q: Apakah dashboard support HTTPS?
**A:** **Ya!** Setup reverse proxy (Nginx) dengan SSL certificate. Panduan ada di documentation.

### Q: Berapa resource yang dibutuhkan dashboard?
**A:**
- **RAM**: ~100-200 MB
- **CPU**: Minimal
- **Storage**: ~50 MB (tanpa node_modules)
- **Bandwidth**: Minimal

### Q: Apakah dashboard bisa handle multiple admins?
**A:** **Ya!** Tambahkan multiple Discord IDs ke `ADMIN_IDS`. Semua admin bisa akses bersamaan.

### Q: Apakah ada limit jumlah users yang bisa ditampilkan?
**A:** Dashboard menggunakan pagination (20 users per page), jadi bisa handle ribuan users tanpa masalah.

---

## 🔄 Updates & Maintenance

### Q: Bagaimana cara update dashboard?
**A:**
1. Backup file `.env`
2. Pull latest code dari Git
3. Run `npm install`
4. Restore file `.env`
5. Restart dashboard

### Q: Apakah update dashboard akan menghapus data?
**A:** **Tidak!** Data disimpan di MongoDB, bukan di dashboard. Update code tidak affect data.

### Q: Bagaimana cara backup dashboard?
**A:**
1. Backup file `.env`
2. Backup MongoDB database
3. (Optional) Backup custom code jika ada

### Q: Apakah ada auto-update?
**A:** Belum. Update manual via Git pull. Auto-update mungkin ditambahkan di masa depan.

---

## 💡 Customization

### Q: Bagaimana cara mengubah warna dashboard?
**A:** Edit `dashboard/views/partials/header.ejs`, cari `.gradient-bg` dan ubah colors:
```css
.gradient-bg {
  background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
}
```

### Q: Bagaimana cara menambah menu baru?
**A:**
1. Tambah route di `server/routes/dashboard.js`
2. Buat view di `views/dashboard/`
3. Tambah link di `views/partials/sidebar.ejs`

### Q: Apakah bisa custom logo?
**A:** **Ya!** Edit `views/partials/navbar.ejs`, ganti icon atau tambah image logo.

### Q: Apakah bisa ganti font?
**A:** **Ya!** Edit `views/partials/header.ejs`, ganti Google Fonts import dan CSS.

---

## 📱 Mobile & Responsive

### Q: Apakah dashboard mobile-friendly?
**A:** **Ya!** Dashboard fully responsive untuk mobile, tablet, dan desktop.

### Q: Apakah bisa akses dashboard dari HP?
**A:** **Ya!** Buka browser di HP dan akses URL dashboard. Login dengan Discord seperti biasa.

### Q: Apakah ada mobile app?
**A:** Belum. Saat ini web-based only. Mobile app mungkin dikembangkan di masa depan.

---

## 🔮 Future Features

### Q: Apakah akan ada dark mode?
**A:** **Ya!** Dark mode ada di roadmap dan akan ditambahkan di update mendatang.

### Q: Apakah akan ada export data feature?
**A:** **Ya!** Export to CSV/JSON akan ditambahkan.

### Q: Apakah akan ada multi-language support?
**A:** Mungkin di masa depan. Saat ini fokus di Bahasa Indonesia dan English.

### Q: Apakah bisa request feature baru?
**A:** **Ya!** Buat issue di GitHub atau hubungi developer.

---

## 🤝 Support & Community

### Q: Dimana saya bisa dapat bantuan?
**A:**
1. Baca dokumentasi lengkap
2. Check troubleshooting section
3. Search GitHub issues
4. Create new issue
5. Join Discord support server (if available)

### Q: Bagaimana cara report bug?
**A:** Create issue di GitHub dengan:
- Deskripsi bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (jika ada)
- Error messages

### Q: Bagaimana cara contribute?
**A:** 
1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

### Q: Apakah ada Discord server untuk support?
**A:** Check README untuk link Discord server (jika tersedia).

---

## 💰 Pricing & License

### Q: Apakah dashboard gratis?
**A:** **Ya!** Dashboard 100% gratis dan open source.

### Q: Apakah boleh dimodifikasi?
**A:** **Ya!** Dashboard open source dengan ISC License. Anda bebas modify sesuai kebutuhan.

### Q: Apakah boleh digunakan untuk komersial?
**A:** **Ya!** Silakan gunakan untuk project komersial. Attribution appreciated tapi tidak wajib.

### Q: Apakah ada versi premium?
**A:** Tidak. Semua fitur gratis dan open source.

---

## 📊 Performance

### Q: Apakah dashboard lambat?
**A:** **Tidak!** Dashboard dioptimasi untuk performance:
- Page load < 2 detik
- API response < 500ms
- Real-time updates instant

### Q: Berapa banyak concurrent users yang bisa ditangani?
**A:** Tergantung server specs. Dengan specs standar, bisa handle 10-20 concurrent admins tanpa masalah.

### Q: Apakah dashboard consume banyak bandwidth?
**A:** **Tidak!** Dashboard lightweight. Hanya load data yang diperlukan dengan pagination.

---

## 🎓 Learning

### Q: Apakah saya perlu coding knowledge untuk menggunakan dashboard?
**A:** **Tidak!** Dashboard user-friendly dan tidak perlu coding knowledge untuk penggunaan normal.

### Q: Apakah saya perlu coding knowledge untuk customize?
**A:** **Ya**, untuk customization perlu basic knowledge:
- HTML/CSS untuk styling
- JavaScript untuk functionality
- Node.js/Express untuk backend

### Q: Dimana saya bisa belajar lebih lanjut?
**A:**
- Baca semua documentation
- Check code comments
- Explore file structure
- Try modifying small things
- Join community

---

## 🎯 Best Practices

### Q: Apa yang harus dilakukan sebelum edit data penting?
**A:**
1. **Backup database** terlebih dahulu
2. Test di development environment
3. Verify changes
4. Monitor for issues

### Q: Seberapa sering harus backup?
**A:** Disarankan:
- Daily backup untuk production
- Before major changes
- Before updates

### Q: Apa yang harus dilakukan jika dashboard error?
**A:**
1. Check error messages
2. Check logs
3. Verify configuration
4. Restart dashboard
5. Check documentation
6. Ask for help

---

## 📞 Contact

### Q: Bagaimana cara menghubungi developer?
**A:**
- GitHub Issues
- Discord (if available)
- Email (check README)

### Q: Berapa lama response time untuk support?
**A:** Tergantung availability. Biasanya 24-48 jam untuk GitHub issues.

---

**Tidak menemukan jawaban? Create issue di GitHub!**

Made with ❤️ for Anna Manager Bot
