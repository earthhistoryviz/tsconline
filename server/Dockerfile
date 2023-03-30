FROM ubuntu:latest

RUN apt-get update

RUN apt-get install -y curl

RUN mkdir -p ~/.vnc



RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash && \
    export NVM_DIR="$HOME/.nvm" && \
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \  
      [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" && \ 
    nvm install v18 && \
    nvm use v18 && \
    npm install -g yarn

RUN touch /root/.Xauthority

RUN apt-get install -y x11-xserver-utils


ENV USER=root

RUN apt-get install -y tightvncserver

CMD ["bash", "-c", "echo $VNC_PASSWORD | vncpasswd -f > ~/.vnc/passwd && chmod 0600 ~/.vnc/passwd && vncserver :1 -localhost no -geometry 1280x720"]

