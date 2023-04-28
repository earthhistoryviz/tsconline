# Pull base image.
FROM jlesage/baseimage-gui:ubuntu-20.04

RUN rm /var/lib/dpkg/statoverride && \
    rm /var/lib/dpkg/lock && \
    dpkg --configure -a && \
    apt-get -f install
# Download Java    
RUN apt-get update && \
    apt-get install -y openjdk-8-jdk && \
    apt-get install -y apt-utils && \
    apt-get install -y git

RUN git clone https://github.com/earthhistoryviz/tsconline.git

COPY TSC.jar  /
COPY datapack.txt /
COPY settings.tsc /
ADD ../../tsconline /

# Install xterm.
RUN add-pkg xterm

# Copy the start script.
COPY startapp.sh /startapp.sh

# Set the name of the application.

