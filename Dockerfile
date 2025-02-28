# Pull base image.
FROM node:20

RUN apt update && \
    apt install -y curl wget openbox x11vnc xvfb build-essential

# Download Java and necessary tools
RUN apt install -y openjdk-17-jdk apt git xterm python3

RUN corepack enable

# Command to save a password (the entrypoint.sh script actually runs x11 and it uses the environment for the password)
# RUN x11vnc -storepasswd 1234 ~/.vnc/passwd

# Setup the container to run the code from the local machine:
WORKDIR /code
CMD /code/entrypoint.sh
