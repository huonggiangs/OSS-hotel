plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android { namespace = "vn.khachsan.so.owner"; compileSdk = 35
    defaultConfig { applicationId = "vn.khachsan.so.owner"; minSdk = 26; targetSdk = 35; versionCode = 6; versionName = "0.4.0" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildTypes { release { isMinifyEnabled = false; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") } }
}
