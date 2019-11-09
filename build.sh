#!/bin/sh
#
# transpile, place, and bundle

[ -d build ] || mkdir -v build
[ -d data ] || mkdir -pv data/db

if [ ! -d keys ]; then
	mkdir keys
	sudo chown root.sshd keys
	sudo chmod 2750 keys
	sudo openssl req -nodes -newkey rsa:2048 -sha256 \
        -keyout "keys/localhost.key" -x509 -days 1095 -out "keys/localhost.crt" \
		-subj "/C=US/ST=Massachusetts/L=Boston/O=Beth Israel Deaconess Medical Center Inc/OU=IS/CN=localhost"
fi

if [ ! -d node_modules ]; then
    mkdir node_modules
    sudo chown nobody.wheel node_modules
    sudo chmod 2575 node_modules

    NODEJS=$( dirname "`which node 2> /dev/null`" )
    [ "${NODEJS}" = "." ] && NODEJS=/opt/rh/rh-nodejs10/root/usr/bin
    if [ ! -f $NODEJS/node ]; then
        sudo yum install gcc gcc-c++ rh-nodejs10-nodejs
        [ -n "$http_proxy" ] && $NODEJS/npm config set proxy=$http_proxy
        [ -n "$https_proxy" ] && $NODEJS/npm config set https-proxy=$https_proxy
    fi
fi

echo "Transpiling ... "
./tsc -p ./src --outDir ./build
