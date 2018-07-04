#!/bin/sh

sudo docker stop turnbased
sudo docker rm turnbased
sudo docker build -t turnbased .
sudo docker create --name turnbased -p 9306:9306 -v logvol:/log turnbased:latest
sudo docker start turnbased
sudo docker ps -a
sudo tail -f /var/lib/docker/volumes/logvol/_data/turnbased.log

