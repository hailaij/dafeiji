plugins {
    id("com.android.application")
}

android {
    namespace = "com.neonstrike.game"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.neonstrike.game"
        minSdk = 24
        targetSdk = 34
        versionCode = 6
        versionName = "1.2.4"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += setOf("META-INF/LICENSE*", "META-INF/NOTICE*")
    }
}

/* 强制统一 Kotlin stdlib 版本,避免 AGP 8.5.2 的 1.8.22 与旧传递依赖 1.6.21 产生重复类冲突 */
configurations.all {
    resolutionStrategy {
        force("org.jetbrains.kotlin:kotlin-stdlib:1.8.22")
        force("org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.22")
        force("org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.8.22")
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
