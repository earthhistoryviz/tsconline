# Pull base image.
FROM jlesage/baseimage-gui:ubuntu-20.04

# Download Java    
RUN apt-get update && \
    apt-get install -y openjdk-8-jdk

COPY TSC.jar /
COPY datapack.txt /
COPY settings.tsc /

# Install xterm.
RUN add-pkg xterm

# Copy the start script.
COPY startapp.sh /startapp.sh

# Set the name of the application.

CMD ["java", "-jar", "TSC.jar"]


