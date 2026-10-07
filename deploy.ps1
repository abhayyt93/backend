ssh -i "kosmico-key.pem" -o StrictHostKeyChecking=no ubuntu@api.kosmicowellness.com "cd /home/ubuntu/backend && git pull origin main && npm install && pm2 restart all"
