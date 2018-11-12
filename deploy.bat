echo --- Create and upload the docker image
call docker build -t braincloud/rsm ./
call docker push braincloud/rsm

echo --- Stop, pull and restart the docker image on BCChat server
call plink -ssh -i "%userprofile%/.ssh/rsm.ppk" ec2-user@ec2-18-219-26-183.us-east-2.compute.amazonaws.com "sudo docker stop rsm"
call plink -ssh -i "%userprofile%/.ssh/rsm.ppk" ec2-user@ec2-18-219-26-183.us-east-2.compute.amazonaws.com "sudo docker rm rsm"
call plink -ssh -i "%userprofile%/.ssh/rsm.ppk" ec2-user@ec2-18-219-26-183.us-east-2.compute.amazonaws.com "sudo docker pull braincloud/rsm"
call plink -ssh -i "%userprofile%/.ssh/rsm.ppk" ec2-user@ec2-18-219-26-183.us-east-2.compute.amazonaws.com "sudo docker run --name rsm -d -p 9306:9306 -p 9308:9308 -p 9310:9310 braincloud/rsm"
