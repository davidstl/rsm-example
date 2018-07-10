#!/bin/bash

echo --- Create and upload the docker image
docker build -t braincloud/rsm ./
docker push braincloud/rsm

echo --- Stop, pull and restart the docker image on nrt
ssh rsm 'sudo docker stop rsm'
ssh rsm 'sudo docker rm rsm'
ssh rsm 'sudo docker pull braincloud/rsm'
ssh rsm 'sudo docker run --name rsm -d -p 9306:9306 -p 9308:9308 braincloud/rsm'
