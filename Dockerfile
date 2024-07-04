# Pull base image.
FROM ubuntu:latest

RUN apt-get update && \
    apt-get install -y curl wget openbox x11vnc xvfb


# Download Java    
RUN apt-get install -y openjdk-17-jdk
RUN apt-get install -y apt-utils
RUN apt-get install -y git
RUN apt-get install -y curl
Run apt-get install -y xterm

# Command to save a password (the entrypoint.sh script actually runs x11 and it uses the environment for the password)
# RUN x11vnc -storepasswd 1234 ~/.vnc/passwd

# Install yarn/npm/node via nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash 
# Note: you need the --login option and the PS1 variable to be set in order for /root/.bashrc to run properly
RUN bash --login -c "export PS1=':' && source /root/.bashrc && nvm install node && nvm use node && npm install -g yarn"
RUN bash --login -c "export PS1=':' && source /root/.nvm/nvm.sh && nvm use node && yarn && yarn build"

# Setup the container to run the code from the local machine:
WORKDIR /code
CMD /code/entrypoint.sh
