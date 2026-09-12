plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val publicApiBase = providers.gradleProperty("anioPublicApiBase")
    .orElse(providers.environmentVariable("ANIO_PUBLIC_API_BASE_URL"))
    .orElse("")
    .get()
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")

android { namespace = "vn.khachsan.so.owner"; compileSdk = 35
    defaultConfig {
        applicationId = "vn.khachsan.so.owner"; minSdk = 26; targetSdk = 35; versionCode = 7; versionName = "0.5.0"
        buildConfigField("String", "PUBLIC_API_BASE_URL", "\"$publicApiBase\"")
    }
    buildFeatures { buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    defaultConfig { manifestPlaceholders["usesCleartext"] = "false" }
    buildTypes {
        debug { manifestPlaceholders["usesCleartext"] = "true" }
        release {
            manifestPlaceholders["usesCleartext"] = "false"
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}
