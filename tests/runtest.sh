#!/bin/bash
# usage: runtest.sh script.js
pkill -f "node server.js" ; pkill -f "http.server 8001"; sleep 0.5
rm -rf /tmp/tw; mkdir /tmp/tw; cp -r /tmp/imp/app/src/main/assets/www/. /tmp/tw/
sed -i "s#var SRV='https://bmf-lobby.onrender.com'#var SRV='http://localhost:8090'#" /tmp/tw/index.html
(cd /tmp/srv && PORT=8090 node server.js > /tmp/srv.log 2>&1 &)
(cd /tmp/tw && python3 -m http.server 8001 > /dev/null 2>&1 &)
sleep 1.5; cd /tmp/pt && timeout 100 node $1 2>&1 | cut -c1-400
pkill -f "node server.js"; pkill -f "http.server 8001"
