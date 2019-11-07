#!/bin/sh
#
# transpile, place, and bundle
echo "Transpiling ... "
TSC=./tsc
[ -x "${TSC}" ] || npm install
${TSC} -p ./src --outDir ./build
