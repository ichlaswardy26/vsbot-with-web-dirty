# SSL Certificates

Tempatkan sertifikat SSL Anda di folder ini untuk mengaktifkan HTTPS.

## File yang Diperlukan

- `cert.pem` - Sertifikat SSL
- `key.pem` - Private key SSL

## Cara Mendapatkan SSL Certificate

### 1. Let's Encrypt (Gratis)
```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/key.pem
```

### 2. Cloudflare (Gratis)
1. Login ke Cloudflare Dashboard
2. Pilih domain Anda
3. Go to SSL/TLS > Origin Server
4. Create Certificate
5. Download dan simpan sebagai `cert.pem` dan `key.pem`

### 3. Self-Signed (Development)
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/ssl/key.pem \
  -out ./nginx/ssl/cert.pem \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=VillainSeraphyx/CN=localhost"
```

## Mengaktifkan HTTPS

1. Pastikan file `cert.pem` dan `key.pem` ada di folder ini
2. Uncomment baris SSL di `nginx/nginx.conf`
3. Restart nginx: `docker-compose -f docker-compose.nginx.yml restart nginx`

## Auto-Renewal (Let's Encrypt)

Tambahkan ke crontab:
```bash
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /path/to/docker-compose.nginx.yml restart nginx
```