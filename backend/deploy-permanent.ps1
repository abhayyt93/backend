$sg_id = aws ec2 describe-security-groups --group-names kosmico-sg --query 'SecurityGroups[0].GroupId' --output text

if ($sg_id -eq "None" -or $sg_id -eq "") {
    Write-Host "Creating Security Group..."
    $sg_id = aws ec2 create-security-group --group-name kosmico-sg --description "Kosmico Web SG" --query 'GroupId' --output text
    aws ec2 authorize-security-group-ingress --group-id $sg_id --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $sg_id --protocol tcp --port 22 --cidr 0.0.0.0/0
}

$ami_id = aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 --query 'Parameters[0].Value' --output text
Write-Host "Using AMI: $ami_id"

Write-Host "Launching Instance with Key Pair: kosmico-key"
$instance_id = aws ec2 run-instances --image-id $ami_id --count 1 --instance-type t3.micro --key-name kosmico-key --security-group-ids $sg_id --user-data file://userdata.sh --query 'Instances[0].InstanceId' --output text
Write-Host "Launched Instance: $instance_id"

Write-Host "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $instance_id

$allocation_id = "eipalloc-05dc075fa215066c4"
Write-Host "Associating Elastic IP ($allocation_id) to $instance_id..."
aws ec2 associate-address --instance-id $instance_id --allocation-id $allocation_id

Write-Host "Deployment complete! Your server is now accessible permanently at 3.7.180.215"
