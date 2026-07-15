$sg_id = aws ec2 create-security-group --group-name kosmico-sg --description "Kosmico Web SG" --query 'GroupId' --output text
Write-Host "Created Security Group: $sg_id"

aws ec2 authorize-security-group-ingress --group-id $sg_id --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $sg_id --protocol tcp --port 22 --cidr 0.0.0.0/0

$ami_id = aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 --query 'Parameters[0].Value' --output text
Write-Host "Using AMI: $ami_id"

$instance_id = aws ec2 run-instances --image-id $ami_id --count 1 --instance-type t2.micro --security-group-ids $sg_id --user-data file://userdata.sh --query 'Instances[0].InstanceId' --output text
Write-Host "Launched Instance: $instance_id"

Write-Host "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $instance_id

$public_ip = aws ec2 describe-instances --instance-ids $instance_id --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
Write-Host "Public IP: $public_ip"
