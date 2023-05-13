# Pull base image.
FROM jlesage/baseimage-gui:ubuntu-20.04

RUN rm /var/lib/dpkg/statoverride && \
    rm /var/lib/dpkg/lock && \
    dpkg --configure -a && \
    apt-get -f install
RUN apt-get update

# Download Java    
RUN apt-get install -y openjdk-8-jdk
RUN apt-get install -y apt-utils
RUN apt-get install -y git
RUN apt-get install -y curl

# Install xterm.
RUN add-pkg xterm

# Install yarn/npm/node

#ENV NODE_VERSION=18.4.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
ENV NVM_DIR=/config/xdg/config/nvm
#RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
#RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
#RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm install node
RUN . "$NVM_DIR/nvm.sh" && nvm use node
RUN . "$NVM_DIR/nvm.sh" && nvm use node && npm install -g yarn


# Copy the start script.
WORKDIR /code

# Note: for this image, you cannot override the CMD.  It is expecting your startup script to be 
# located at /startapp.sh
COPY ./startapp.sh /startapp.sh
