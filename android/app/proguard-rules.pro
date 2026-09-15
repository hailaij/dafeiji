# NEON STRIKE proguard rules (release build keeps WebView bridge intact)
-keep class com.neonstrike.game.** { *; }
-keepattributes JavascriptInterface
