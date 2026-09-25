plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Upload-Key kommt aus Umgebungsvariablen (GitHub-Secrets) – nie ins Repo.
val keystorePath: String? = System.getenv("LUXE_KEYSTORE_PATH")

android {
    namespace = "ch.luxestyle.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "ch.luxestyle.app"
        minSdk = 24
        targetSdk = 36
        versionCode = (System.getenv("LUXE_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("LUXE_VERSION_NAME") ?: "1.0.0"
    }

    signingConfigs {
        if (keystorePath != null) {
            create("upload") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("LUXE_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("LUXE_KEY_ALIAS") ?: "upload"
                keyPassword = System.getenv("LUXE_KEY_PASSWORD") ?: System.getenv("LUXE_KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystorePath != null) signingConfig = signingConfigs.getByName("upload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("com.google.android.material:material:1.12.0")

    testImplementation("junit:junit:4.13.2")
}
