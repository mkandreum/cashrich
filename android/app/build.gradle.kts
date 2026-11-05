plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Las pruebas locales pueden apuntar a otro servidor: -PbaseUrl=http://10.0.2.2:3456
val baseUrl = providers.gradleProperty("baseUrl").getOrElse("https://cashrich.xyoncloud.win")

android {
    namespace = "win.xyoncloud.cashrich"
    compileSdk = 36

    defaultConfig {
        applicationId = "win.xyoncloud.cashrich"
        minSdk = 27
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        buildConfigField("String", "BASE_URL", "\"$baseUrl\"")
        // http solo si se compila contra un servidor de pruebas
        manifestPlaceholders["cleartext"] = baseUrl.startsWith("http://").toString()
    }

    // Dos APK del mismo código: el juego completo para móvil y la pantalla para TV.
    flavorDimensions += "device"
    productFlavors {
        create("movil") {
            dimension = "device"
            buildConfigField("boolean", "IS_TV", "false")
        }
        create("tv") {
            dimension = "device"
            applicationIdSuffix = ".tv"
            buildConfigField("boolean", "IS_TV", "true")
        }
    }

    // CI firma con el secreto KEYSTORE_B64 para que las versiones se actualicen entre sí.
    val keystore = System.getenv("KEYSTORE_PATH")
    signingConfigs {
        if (keystore != null) {
            create("upload") {
                storeFile = file(keystore)
                storePassword = System.getenv("STORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = if (keystore != null) signingConfigs.getByName("upload") else signingConfigs.getByName("debug")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
    // Los edificios son los mismos que dibuja la web
    sourceSets["main"].assets.srcDir("../../web/shared")
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.profileinstaller:profileinstaller:1.3.1")

    implementation(platform("androidx.compose:compose-bom:2024.09.02"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")

    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:okhttp-sse:4.12.0")
    implementation("com.google.zxing:core:3.5.3")
}
