ssh -i "kosmico-key.pem" -o StrictHostKeyChecking=no ec2-user@3.7.180.215 "cd /home/ec2-user/app && git pull origin main && npm install && pm2 restart kosmico-backend --update-env"
