package vn.khachsan.so.owner

import android.content.Context
import android.net.Uri
import android.os.Build
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.URI
import java.util.Locale
import java.util.UUID

/**
 * Tìm PMS mà không bắt người dùng nhập URL.
 * Thứ tự: domain HTTPS của bản production -> deep link HQ -> endpoint từng
 * dùng thành công -> emulator -> discovery UDP trong LAN.
 */
class ServerLocator(private val context: Context, private val api: MobileApi) {
    private val preferences = context.getSharedPreferences("anio_server_locator", Context.MODE_PRIVATE)

    fun locate(deepLink: Uri? = null): String? {
        val candidates = linkedSetOf<String>()
        BuildConfig.PUBLIC_API_BASE_URL.trim().takeIf { it.isNotBlank() }?.let(candidates::add)
        deepLink?.getQueryParameter("endpoint")?.let(candidates::add)
        preferences.getString("verified_api_base", null)?.let(candidates::add)
        if (isEmulator()) candidates.add("http://10.0.2.2:3100/api/backend")
        discoverLan().forEach(candidates::add)

        return candidates.asSequence()
            .map { it.trimEnd('/') }
            .filter(::isAllowedEndpoint)
            .firstOrNull { api.isAnioPms(it) }
            ?.also { preferences.edit().putString("verified_api_base", it).apply() }
    }

    private fun discoverLan(): List<String> {
        val nonce = UUID.randomUUID().toString()
        val request = JSONObject().put("type", "ANIO_DISCOVER_V1").put("nonce", nonce).toString().toByteArray()
        val found = linkedSetOf<String>()
        runCatching {
            DatagramSocket().use { socket ->
                socket.broadcast = true
                socket.soTimeout = 1_500
                socket.send(DatagramPacket(request, request.size, InetAddress.getByName("255.255.255.255"), 53535))
                val deadline = System.currentTimeMillis() + 2_200
                while (System.currentTimeMillis() < deadline) {
                    val buffer = ByteArray(2048)
                    val packet = DatagramPacket(buffer, buffer.size)
                    try {
                        socket.receive(packet)
                        val response = JSONObject(String(packet.data, 0, packet.length, Charsets.UTF_8))
                        if (response.optString("service") != "ANIO_PMS" || response.optString("nonce") != nonce) continue
                        val protocol = response.optString("protocol", "http")
                        val port = response.optInt("port", 3100)
                        val path = response.optString("apiPath", "/api/backend")
                        found.add("$protocol://${packet.address.hostAddress}:$port$path")
                    } catch (_: java.net.SocketTimeoutException) {
                        break
                    }
                }
            }
        }
        return found.toList()
    }

    private fun isAllowedEndpoint(value: String): Boolean = runCatching {
        val uri = URI(value)
        if (uri.scheme == "https") return@runCatching !uri.host.isNullOrBlank()
        if (uri.scheme != "http") return@runCatching false
        val host = uri.host ?: return@runCatching false
        host == "10.0.2.2" || host == "127.0.0.1" || host.startsWith("10.") || host.startsWith("192.168.") ||
            Regex("^172\\.(1[6-9]|2\\d|3[01])\\.").containsMatchIn(host)
    }.getOrDefault(false)

    private fun isEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT.lowercase(Locale.getDefault())
        val model = Build.MODEL.lowercase(Locale.getDefault())
        return fingerprint.contains("generic") || model.contains("emulator") || model.contains("sdk_gphone")
    }
}
