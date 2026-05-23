#!/bin/bash
#───────────────────────────────────────────────────────────────────────────────
# build-apk.sh — Build HaikZTIFY APK tanpa Android Studio
# 
# Requirement:
#   - Linux/macOS/WSL
#   - Java 17+ (JDK)
#   - Internet connection (first run downloads SDK + Gradle)
#
# Usage:
#   chmod +x build-apk.sh
#   ./build-apk.sh              # debug APK
#   ./build-apk.sh release      # release APK (unsigned)
#───────────────────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BUILD_TYPE="${1:-debug}"

#─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   🎵 HaikZTIFY APK Builder (no AS)      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

#─── 1. Check Java ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/5]${NC} Checking Java..."
if ! command -v java &>/dev/null; then
  echo -e "${RED}❌ Java not found!${NC}"
  echo ""
  echo "Install Java 17:"
  echo "  Ubuntu/Debian/Kali: sudo apt install openjdk-17-jdk"
  echo "  Arch:               sudo pacman -S jdk17-openjdk"
  echo "  macOS:              brew install openjdk@17"
  echo "  Windows (WSL):      sudo apt install openjdk-17-jdk"
  exit 1
fi

JAVA_VER=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VER" -lt 17 ] 2>/dev/null; then
  echo -e "${RED}❌ Java 17+ required, found Java $JAVA_VER${NC}"
  echo "Install: sudo apt install openjdk-17-jdk"
  exit 1
fi
echo -e "${GREEN}  ✅ Java $JAVA_VER found${NC}"

#─── 2. Setup Android SDK (cmdline-tools) ──────────────────────────────────────
ANDROID_SDK="$HOME/android-sdk"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

echo -e "${YELLOW}[2/5]${NC} Setting up Android SDK..."

if [ ! -d "$ANDROID_SDK/cmdline-tools/latest" ]; then
  echo "  → Downloading Android command-line tools..."
  mkdir -p "$ANDROID_SDK/cmdline-tools"
  
  TMPZIP="/tmp/cmdline-tools.zip"
  if command -v wget &>/dev/null; then
    wget -q --show-progress -O "$TMPZIP" "$CMDLINE_TOOLS_URL"
  elif command -v curl &>/dev/null; then
    curl -L --progress-bar -o "$TMPZIP" "$CMDLINE_TOOLS_URL"
  else
    echo -e "${RED}❌ wget or curl required${NC}"
    exit 1
  fi
  
  unzip -q "$TMPZIP" -d "$ANDROID_SDK/cmdline-tools"
  mv "$ANDROID_SDK/cmdline-tools/cmdline-tools" "$ANDROID_SDK/cmdline-tools/latest"
  rm "$TMPZIP"
  echo -e "${GREEN}  ✅ Command-line tools installed${NC}"
else
  echo -e "${GREEN}  ✅ Command-line tools already installed${NC}"
fi

export ANDROID_HOME="$ANDROID_SDK"
export PATH="$ANDROID_SDK/cmdline-tools/latest/bin:$ANDROID_SDK/platform-tools:$PATH"

#─── 3. Install SDK packages ──────────────────────────────────────────────────
echo -e "${YELLOW}[3/5]${NC} Installing SDK packages..."

# Accept licenses
yes | sdkmanager --licenses > /dev/null 2>&1 || true

# Install required packages (minimal set)
PACKAGES=(
  "platforms;android-34"
  "build-tools;34.0.0"
  "platform-tools"
)

for pkg in "${PACKAGES[@]}"; do
  if [ ! -d "$ANDROID_SDK/$(echo $pkg | tr ';' '/')" ]; then
    echo "  → Installing $pkg..."
    sdkmanager "$pkg" > /dev/null 2>&1
  fi
done
echo -e "${GREEN}  ✅ SDK packages ready${NC}"

#─── 4. Create local.properties ────────────────────────────────────────────────
echo "sdk.dir=$ANDROID_SDK" > "$SCRIPT_DIR/local.properties"

#─── 5. Build APK ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/5]${NC} Building APK ($BUILD_TYPE)..."
echo ""

if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew assembleRelease --no-daemon --warning-mode=none 2>&1 | tail -20
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
else
  ./gradlew assembleDebug --no-daemon --warning-mode=none 2>&1 | tail -20
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

echo ""

#─── 6. Result ─────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/5]${NC} Done!"

if [ -f "$APK_PATH" ]; then
  SIZE=$(du -sh "$APK_PATH" | cut -f1)
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✅ APK BERHASIL DI-BUILD!              ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  📦 Path: ${CYAN}$APK_PATH${NC}"
  echo -e "  📏 Size: ${CYAN}$SIZE${NC}"
  echo ""
  echo "  Transfer ke HP:"
  echo "    adb install $APK_PATH"
  echo "    # atau copy manual ke HP dan install"
  echo ""
  
  # Copy ke root android/ for easy access
  cp "$APK_PATH" "$SCRIPT_DIR/haikztify-${BUILD_TYPE}.apk"
  echo -e "  📋 Copied to: ${CYAN}$SCRIPT_DIR/haikztify-${BUILD_TYPE}.apk${NC}"
else
  echo -e "${RED}❌ Build failed — APK not found at $APK_PATH${NC}"
  echo "  Check error log above"
  exit 1
fi
