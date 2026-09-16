#!/bin/bash

# Ensure system is updated
sudo dnf update -y

# Install Nginx
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Create Nginx configuration for api.kosmicowellness.com
cat << 'NGINX_EOF' | sudo tee /etc/nginx/conf.d/api.kosmicowellness.com.conf
server {
    listen 80;
    server_name api.kosmicowellness.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

# Reload Nginx to apply config
sudo nginx -s reload

# Install Certbot (Let's Encrypt)
sudo dnf install -y augeas-libs
sudo python3 -m venv /opt/certbot/
sudo /opt/certbot/bin/pip install --upgrade pip
sudo /opt/certbot/bin/pip install certbot certbot-nginx
sudo ln -sf /opt/certbot/bin/certbot /usr/bin/certbot

# Request SSL Certificate
sudo certbot --nginx -d api.kosmicowellness.com --non-interactive --agree-tos -m kosmicowellness@gmail.com --redirect
