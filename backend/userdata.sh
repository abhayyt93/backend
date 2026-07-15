#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting deployment script..."

# Update and install dependencies
yum update -y
yum install -y git

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Clone repository
cd /home/ec2-user
git clone https://github.com/abhayyt93/backend.git app
cd app

# The actual backend code is in the 'backend' folder
cd backend

# Create .env file
cat << 'EOF' > .env
PORT=80
NODE_ENV=production
MONGO_URI=mongodb+srv://KosmicoWellness:KosmicoWellness@cluster0.67auck3.mongodb.net/kosmico
JWT_SECRET=Kosmico_Secret_Key_123
EMAIL_USER=kosmicowellness@gmail.com
EMAIL_PASS=eovrvxozlroxazzl
EOF

# Install dependencies
npm install

# Install pm2 globally to keep the app running
npm install -g pm2

# Allow node to bind to port 80
setcap cap_net_bind_service=+ep $(readlink -f $(which node))

# Start the application using pm2
pm2 start src/index.js --name "kosmico-backend"
pm2 save
pm2 startup | tail -n 1 | bash

echo "Deployment complete!"
