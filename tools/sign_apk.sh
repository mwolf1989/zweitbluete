#!/bin/sh
# Re-signs a release APK with the project's release key.
#
# Expo's generated Android project signs release builds with the debug key.
# Because android/ is generated and not edited by hand, the APK is signed
# again afterwards instead.
#
#   tools/sign_apk.sh <input.apk> <output.apk> <signing.properties>
#
# signing.properties holds storeFile, keyAlias, storePassword and keyPassword.
# It and the keystore live outside the repository.
set -eu

input="$1"
output="$2"
properties="$3"

value() {
  grep "^$1=" "$properties" | cut -d= -f2-
}

build_tools=$(ls -d "${ANDROID_HOME:?ANDROID_HOME is not set}"/build-tools/* | sort -V | tail -1)

"$build_tools/zipalign" -f -p 4 "$input" "$output.aligned"
"$build_tools/apksigner" sign \
  --ks "$(value storeFile)" \
  --ks-key-alias "$(value keyAlias)" \
  --ks-pass "pass:$(value storePassword)" \
  --key-pass "pass:$(value keyPassword)" \
  --out "$output" \
  "$output.aligned"
rm -f "$output.aligned" "$output.idsig"
"$build_tools/apksigner" verify --print-certs "$output" | grep -E 'DN|SHA-256'
