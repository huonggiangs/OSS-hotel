package vn.khachsan.so.owner

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

class MobileApi {
    fun isAnioPms(base: String): Boolean = runCatching {
        val response = request(base, "/api/v1/mobile/discovery")
        response.optString("service") == "ANIO_PMS" && response.optInt("api_version") >= 1
    }.getOrDefault(false)

    private fun request(
        base: String,
        path: String,
        method: String = "GET",
        body: JSONObject? = null,
        token: String? = null,
        propertyId: String? = null,
    ): JSONObject {
        val connection = URL(base.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 10_000
            connection.readTimeout = 20_000
            connection.setRequestProperty("Accept", "application/json")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (!propertyId.isNullOrBlank()) connection.setRequestProperty("X-Property-Id", propertyId)
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.outputStream.use { it.write(body.toString().toByteArray(StandardCharsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader(StandardCharsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                val message = runCatching { JSONObject(response).optString("message") }.getOrNull()
                throw IllegalStateException(message?.takeIf { it.isNotBlank() } ?: "Máy chủ trả về lỗi HTTP $status")
            }
            return if (response.isBlank()) JSONObject() else JSONObject(response)
        } finally {
            connection.disconnect()
        }
    }

    fun deviceLogin(
        base: String,
        propertyCode: String,
        username: String,
        password: String,
        deviceId: String,
        deviceName: String,
        appVersion: String,
        isEmulator: Boolean,
    ): JSONObject = request(
        base,
        "/api/v1/mobile/device-login",
        "POST",
        JSONObject()
            .put("propertyCode", propertyCode)
            .put("username", username)
            .put("password", password)
            .put("platform", "ANDROID")
            .put("deviceId", deviceId)
            .put("deviceName", deviceName)
            .put("appVersion", appVersion)
            .put("isEmulator", isEmulator),
    )

    fun deviceRefresh(base: String, connectionId: String, deviceSecret: String): JSONObject = request(
        base,
        "/api/v1/mobile/device-refresh",
        "POST",
        JSONObject().put("connectionId", connectionId).put("deviceSecret", deviceSecret),
    )

    fun me(base: String, token: String, propertyId: String?): JSONObject =
        request(base, "/api/v1/auth/me", token = token, propertyId = propertyId)

    fun bootstrap(base: String, token: String, propertyId: String?): JSONObject =
        request(base, "/api/v1/mobile/bootstrap", token = token, propertyId = propertyId)

    fun overview(base: String, token: String, propertyId: String?): JSONObject =
        request(base, "/api/v1/mobile/overview", token = token, propertyId = propertyId)

    fun workQueue(base: String, token: String, propertyId: String?): JSONObject =
        request(base, "/api/v1/mobile/work-queue", token = token, propertyId = propertyId)

    fun rooms(base: String, token: String, propertyId: String?): JSONArray =
        request(base, "/api/v1/rooms", token = token, propertyId = propertyId).optJSONArray("items") ?: JSONArray()

    fun setRoomPower(base: String, token: String, propertyId: String?, roomId: String, powerOn: Boolean): JSONObject =
        request(base, "/api/v1/rooms/$roomId/power", "PATCH", JSONObject().put("powerOn", powerOn), token, propertyId)

    fun completeHousekeeping(base: String, token: String, propertyId: String?, roomId: String): JSONObject =
        request(base, "/api/v1/rooms/$roomId/housekeeping-complete", "POST", JSONObject(), token, propertyId)

    fun bookings(base: String, token: String, propertyId: String?, search: String = ""): JSONArray {
        val suffix = if (search.isBlank()) "" else "?search=${encode(search)}"
        return request(base, "/api/v1/bookings$suffix", token = token, propertyId = propertyId).optJSONArray("items") ?: JSONArray()
    }

    fun booking(base: String, token: String, propertyId: String?, bookingId: String): JSONObject =
        request(base, "/api/v1/bookings/$bookingId", token = token, propertyId = propertyId)

    fun createCustomer(base: String, token: String, propertyId: String?, fullName: String, phone: String): JSONObject =
        request(base, "/api/v1/customers", "POST", JSONObject().put("fullName", fullName).put("phone", phone).put("segment", "Mới"), token, propertyId)

    fun createBooking(base: String, token: String, propertyId: String?, input: JSONObject): JSONObject =
        request(base, "/api/v1/bookings", "POST", input, token, propertyId)

    fun bookingAction(base: String, token: String, propertyId: String?, bookingId: String, action: String, body: JSONObject = JSONObject()): JSONObject =
        request(base, "/api/v1/bookings/$bookingId/$action", "POST", body, token, propertyId)

    fun settlementPreview(base: String, token: String, propertyId: String?, bookingId: String): JSONObject =
        bookingAction(base, token, propertyId, bookingId, "settlement-preview", JSONObject().put("paymentMethod", "CASH"))

    fun settlementFinalize(base: String, token: String, propertyId: String?, bookingId: String, invoiceId: String): JSONObject =
        bookingAction(base, token, propertyId, bookingId, "settlement-finalize", JSONObject().put("invoiceId", invoiceId))

    fun createMaintenance(base: String, token: String, propertyId: String?, input: JSONObject): JSONObject =
        request(base, "/api/v1/maintenance", "POST", input, token, propertyId)

    fun updateMaintenanceStatus(base: String, token: String, propertyId: String?, requestId: String, status: String): JSONObject =
        request(base, "/api/v1/maintenance/$requestId/status", "PATCH", JSONObject().put("status", status), token, propertyId)

    fun search(base: String, token: String, propertyId: String?, query: String): JSONObject {
        val encoded = encode(query)
        val customers = request(base, "/api/v1/customers?search=$encoded", token = token, propertyId = propertyId)
        val bookings = request(base, "/api/v1/bookings?search=$encoded", token = token, propertyId = propertyId)
        return JSONObject().put("customers", customers.optJSONArray("items") ?: JSONArray()).put("bookings", bookings.optJSONArray("items") ?: JSONArray())
    }

    private fun encode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.name())
}
