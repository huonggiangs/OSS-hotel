package vn.khachsan.so.owner

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class DeviceCredential(val connectionId: String, val deviceSecret: String)

/** Lưu secret tự đăng nhập bằng khóa không xuất được khỏi Android Keystore. */
class DeviceCredentialStore(context: Context) {
    private val preferences = context.getSharedPreferences("anio_secure_device", Context.MODE_PRIVATE)
    private val alias = "anio_mobile_device_session_v1"

    fun save(connectionId: String, deviceSecret: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = cipher.doFinal(deviceSecret.toByteArray(Charsets.UTF_8))
        preferences.edit()
            .putString("connection_id", connectionId)
            .putString("secret_iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString("secret_ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .apply()
    }

    fun load(): DeviceCredential? = runCatching {
        val connectionId = preferences.getString("connection_id", null)?.takeIf { it.isNotBlank() }
            ?: return null
        val iv = Base64.decode(preferences.getString("secret_iv", null), Base64.NO_WRAP)
        val encrypted = Base64.decode(preferences.getString("secret_ciphertext", null), Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
        DeviceCredential(connectionId, String(cipher.doFinal(encrypted), Charsets.UTF_8))
    }.getOrElse {
        clear()
        null
    }

    fun clear() {
        preferences.edit().clear().apply()
    }

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(
                KeyGenParameterSpec.Builder(
                    alias,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .build()
            )
            generateKey()
        }
    }
}
