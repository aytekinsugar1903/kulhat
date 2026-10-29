#!/usr/bin/env bash
# Builds a release AAB. Signing material comes only from the environment.
# Nothing in this script creates or stores a keystore in the repository.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${ANDROID_KEYSTORE_PATH:?Set ANDROID_KEYSTORE_PATH to a .jks or .keystore file}"
: "${ANDROID_KEYSTORE_PASSWORD:?Set ANDROID_KEYSTORE_PASSWORD}"
: "${ANDROID_KEY_ALIAS:?Set ANDROID_KEY_ALIAS}"
: "${ANDROID_KEY_PASSWORD:?Set ANDROID_KEY_PASSWORD}"

if [[ ! -f "$ANDROID_KEYSTORE_PATH" ]]; then
  echo "Keystore not found: $ANDROID_KEYSTORE_PATH" >&2
  exit 1
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
node scripts/build-www.mjs
npx cap sync android
cd android
./gradlew bundleRelease
echo "AAB: android/app/build/outputs/bundle/release/app-release.aab"
