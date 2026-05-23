# Haikztify ProGuard Rules

# Keep JS bridge interface
-keepclassmembers class com.haikztify.app.service.AudioBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Keep Glide
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule { <init>(...); }

# Keep WebView JS interface
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
