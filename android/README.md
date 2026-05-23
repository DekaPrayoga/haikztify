# 🎵 HaikZTIFY Android — Build Guide

## ⚡ Build APK Tanpa Android Studio (RAM 4GB friendly!)

### Prerequisites
- **Java 17+** (cuma ini doang!)
  ```bash
  # Ubuntu/Debian/Kali
  sudo apt install openjdk-17-jdk
  
  # Verify
  java -version
  ```

### One-Command Build
```bash
cd android/
chmod +x build-apk.sh
./build-apk.sh          # debug APK
./build-apk.sh release  # release APK
```

Script ini otomatis:
1. ✅ Check Java version
2. ✅ Download Android SDK command-line tools (~150MB, sekali aja)
3. ✅ Install platform SDK + build tools
4. ✅ Run `gradle assembleDebug`
5. ✅ Output: `haikztify-debug.apk`

### Install ke HP
```bash
# Via USB + ADB
adb install haikztify-debug.apk

# Atau copy file .apk ke HP via kabel/cloud, lalu tap install
```

### Set URL Backend
Edit `app/build.gradle.kts`:
```kotlin
buildConfigField("String", "WEB_URL", "\"https://your-frontend.vercel.app\"")
```

---

## 📁 Project Structure
```
android/
├── build-apk.sh               ← ⭐ Run this!
├── build.gradle.kts            ← Root Gradle config
├── settings.gradle.kts
├── gradle.properties
├── gradlew                     ← Gradle wrapper
├── app/
│   ├── build.gradle.kts        ← App config + WEB_URL
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── java/com/haikztify/app/
│           ├── HaikztifyApp.kt
│           ├── ui/MainActivity.kt
│           └── service/
│               ├── AudioPlaybackService.kt  ← ExoPlayer foreground service
│               ├── AudioBridge.kt           ← JS ↔ Kotlin bridge
│               └── BootReceiver.kt
```

## 🎵 How It Works
```
Website (WebView) → FakeAudio.js injected → NativeAudio.play(url)
    → AudioBridge.kt (JavascriptInterface)
    → AudioPlaybackService.kt (ExoPlayer + MediaSession)
    → Foreground Notification → Music keeps playing when app closed ✅
```

## ⚠️ Troubleshooting
- **"Java not found"** → `sudo apt install openjdk-17-jdk`
- **Build OOM (RAM 4GB)** → add to `gradle.properties`:
  ```
  org.gradle.jvmargs=-Xmx1536m
  ```
- **First build slow** → normal, downloads ~500MB of dependencies. Next builds are fast.
