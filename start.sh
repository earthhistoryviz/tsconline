# Ensure everything is up to date
yarn install
cd shared
yarn build
cd ..

SESSION_NAME="tsconline"
# Get PIDs of screen sessions with the name tsconline
PIDS=$(screen -ls | awk '/[0-9]+\.tsconline/{gsub(/\.tsconline.*/, ""); print $1}')

if [ -n "$PIDS" ]; then
    echo "Killing existing screen sessions for $SESSION_NAME..."
    for PID in $PIDS; do
        kill $PID
    done
else
    echo "No existing screen sessions for $SESSION_NAME found."
fi

#Start screen session
# Use Ctrl-a and then n to switch screens
screen -dmS $SESSION_NAME

# First window (0th window is created by default)
screen -S $SESSION_NAME -X screen 0
screen -S $SESSION_NAME -p 0 -X stuff $'cd server && yarn start\r\n'
screen -S $SESSION_NAME -p 0 -X stuff $'bash\r\n'

# Create a new window for the second command
screen -S $SESSION_NAME -X screen 1
screen -S $SESSION_NAME -p 1 -X stuff $'cd server && yarn dev\r\n'
screen -S $SESSION_NAME -p 1 -X stuff $'bash\r\n'

# Create a new window for the third command
screen -S $SESSION_NAME -X screen 2
screen -S $SESSION_NAME -p 2 -X stuff $'cd app && yarn dev\r\n'
screen -S $SESSION_NAME -p 2 -X stuff $'bash\r\n'

# Attach to the session
screen -r $SESSION_NAME