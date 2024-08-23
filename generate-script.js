const fs = require('fs');
const { exec } = require('child_process');

const serverScript = fs.readFileSync('server.js', 'utf8');
const bashScript = `
#!/bin/bash

# Function to clean up on exit
cleanup() {
    echo "Cleaning up..."
    rm tmp.js
    npm uninstall http http-proxy selfsigned
    echo "Done."
}

# Trap SIGINT and EXIT signals to clean up before exiting
trap cleanup SIGINT EXIT

# Check if both the destination URL and clientHostname arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Error: Both Destination URL and Client Hostname are required."
    exit 1
fi

# The first command line argument is the destination URL
destinationURL=$1

# The second command line argument is the client hostname
clientHostname=$2

# Create a temporary JavaScript file
echo "${serverScript.replace(/`/g, '\\`').replace(/\$/g, '\\$')}" > tmp.js

# Install the necessary packages
npm install http http-proxy selfsigned

# Run the server with the provided destination URL and client hostname
node tmp.js $destinationURL $clientHostname
`;

fs.writeFileSync('lightProxy.sh', bashScript);

exec('chmod +x lightProxy.sh', (error) => {
    if (error) {
        console.error(`Error making lightProxy.sh executable: ${error}`);
    } else {
        console.log('lightProxy.sh has been generated and made executable');
    }
});
