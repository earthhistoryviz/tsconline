#! /bin/bash

echo "==========================================="
echo "Starting....."

# Put VNC_PASSWORD=somepassword in your secrets.env file.
# docker-compose will use that to set the environment
mkdir -p ~/.vnc
x11vnc -storepasswd ${VNC_PASSWORD} ~/.vnc/passwd

# You need this PS1 variable to be set for /root/.bashrc to run and get the nvm environment vars
PS1=":"
source /root/.bashrc

XAUTH="/root/.Xauthority"
XERR="/root/.Xerrors"
XARGS="-e $XERR -l -f $XAUTH -n 99 --server-args='-screen 0 1280x1024x24'"
cd /code
echo "-----------------------------------------------------------------------------------------------"
echo "The VNC server is not nomally running to avoid wasting resources.  If you need to view the GUI,"
echo "then you have to start the VNC server yourself, then connect a VNC viewer to localhost:5900."
echo "To start the VNC server, first get a bash shell in the running container:"
echo 
echo "docker-compose exec tsconline bash"
echo 
echo "Now, in that shell, run this command to start the VNC server:"
echo "(The password is set by the value of the VNC_PASSWORD environment variable in secrets.txt)"
echo 
echo "x11vnc -auth $XAUTH -display :99.0 -rfbauth ~/.vnc/passwd -autoport 5900"
echo
echo "However, nothing will show up in the GUI when node is running the java command.  To see the"
echo "actual GUI for testing, you will want an xterm session.  Once you have the VNC server running,"
echo "and you have connected your VNC viewer to localhost:5900 with the password $VNC_PASSWORD"
echo "then CTRL-Z to place the vnc server in the background.  Then run this command to start xterm:"
echo 
echo "DISPLAY=:99.0 xterm"
echo 
echo "You should now see the xterm window in your VNC viewer.  From here you can run the java command"
echo "as you wish and see/interact with the GUI."
echo "When done, exit the xterm, which should give you back control in your bash shell.  To exit the"
echo "backgrounded x11vnc server, bring it back to the foreground:"
echo 
echo "fg"
echo 
echo "and then CTRL-C to stop it.  Now you can exit the bash shell."
echo "-----------------------------------------------------------------------------------------------"
xvfb-run -e $XERR -l -f $XAUTH -n 99 --server-args='-screen 0 1280x1024x24' \
    yarn workspace server start || \
    cat $XERR
