#!/bin/zsh
# Launch the v4 hls-package worker. Usage: ./launch-v4.sh <EVENT_ID>
set -euo pipefail
cd "$(dirname "$0")"
EVENT_ID="${1:?usage: launch-v4.sh <event uuid>}"
ENVFILE=../../backend/.env
val() { grep "^$1=" "$ENVFILE" | head -1 | cut -d= -f2- | tr -d '"' ; }

USERDATA=$(mktemp)
{
  echo '#!/bin/bash'
  echo "export AWS_ACCESS_KEY_ID='$(val AWS_ACCESS_KEY_ID)'"
  echo "export AWS_SECRET_ACCESS_KEY='$(val AWS_SECRET_ACCESS_KEY)'"
  echo "export SUPABASE_URL='$(val SUPABASE_URL)'"
  echo "export SUPABASE_SERVICE_KEY='$(val SUPABASE_SERVICE_KEY)'"
  echo "export EVENT_ID='$EVENT_ID'"
  echo 'mkdir -p /data'
  tail -n +2 per-session-hls.sh
} > "$USERDATA"

AMI=$(aws ssm get-parameter --region ap-northeast-2 \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)

aws ec2 run-instances --region ap-northeast-2 \
  --image-id "$AMI" \
  --instance-type m5.xlarge \
  --instance-initiated-shutdown-behavior terminate \
  --user-data "file://$USERDATA" \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":220,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=vod-hlss-worker},{Key=purpose,Value=hls-package}]' \
  --query 'Instances[0].InstanceId' --output text

rm -f "$USERDATA"
echo "Watch: aws s3 cp s3://360record/wowza/_v4/log.txt - | tail -20"
