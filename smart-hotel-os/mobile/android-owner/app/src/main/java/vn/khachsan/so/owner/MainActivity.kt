package vn.khachsan.so.owner

import android.app.Activity
import android.app.AlertDialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.Editable
import android.text.InputType
import android.text.TextUtils
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.Executors

private enum class AppPage { DASHBOARD, ROOMS, BOOKINGS, ALERTS, ACCOUNT }

class MainActivity : Activity() {
    private val executor = Executors.newSingleThreadExecutor()
    private val api = MobileApi()
    private lateinit var credentialStore: DeviceCredentialStore
    private val primary = Color.rgb(38, 99, 218)
    private val success = Color.rgb(0, 194, 120)
    private val warning = Color.rgb(255, 171, 15)
    private val danger = Color.rgb(232, 48, 71)
    private val ink = Color.rgb(7, 14, 44)
    private val muted = Color.rgb(104, 116, 153)
    private val surface = Color.WHITE
    private val canvasColor = Color.rgb(244, 248, 255)

    private lateinit var content: LinearLayout
    private lateinit var propertyCodeInput: EditText
    private lateinit var userInput: EditText
    private lateinit var passwordInput: EditText
    private var currentPage = AppPage.DASHBOARD
    private var accessToken: String? = null
    private var apiBase = ""
    private var currentUser = JSONObject()
    private var properties = JSONArray()
    private var capabilities = JSONArray()
    private var selectedPropertyId: String? = null
    private var lastRooms = JSONArray()
    private var roomStatusFilter: String? = null
    private var pendingBookingRoomId: String? = null
    private var alertBadgeCount = 0
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = canvasColor
        window.navigationBarColor = surface
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        apiBase = defaultApiBase()
        credentialStore = DeviceCredentialStore(this)
        val preferences = getSharedPreferences("anio", MODE_PRIVATE)
        preferences.edit().remove("pairing_id").remove("pairing_secret").remove("connection_id").remove("device_secret").apply()
        val credential = credentialStore.load()
        if (credential != null) resumeDeviceSession(credential.connectionId, credential.deviceSecret)
        else showLogin()
    }

    private fun showLogin() {
        val preferences = getSharedPreferences("anio", MODE_PRIVATE)
        val savedPropertyCode = preferences.getString("property_code", "").orEmpty()
        val savedUsername = preferences.getString("username", "").orEmpty()
        val body = vertical().apply { setPadding(dp(24), dp(50), dp(24), dp(24)) }
        body.addView(label("ANIO", 34f, true, ink))
        body.addView(label("Ứng dụng vận hành cơ sở", 19f, true, primary))
        body.addView(label("Lần đầu nhập mã cơ sở, tên đăng nhập và mật khẩu. Thiết bị được ghi nhận an toàn để những lần sau tự đăng nhập theo đúng quyền được cấp.", 14f, false, muted), matchWrap(top = 8, bottom = 22))
        propertyCodeInput = field("Mã cơ sở (6 số)", savedPropertyCode, number = true).apply {
            inputType = InputType.TYPE_CLASS_NUMBER
            filters = arrayOf(android.text.InputFilter.LengthFilter(6))
        }
        body.addView(propertyCodeInput, matchWrap(bottom = 10))
        userInput = field("Tên đăng nhập", savedUsername)
        body.addView(userInput, matchWrap(bottom = 10))
        passwordInput = field("Mật khẩu", "", password = true).apply {
            imeOptions = EditorInfo.IME_ACTION_DONE
            setOnEditorActionListener { _, actionId, _ ->
                if (actionId == EditorInfo.IME_ACTION_DONE) { loginDevice(); true } else false
            }
        }
        body.addView(passwordInput, matchWrap(bottom = 18))
        body.addView(actionButton("Đăng nhập", android.R.drawable.ic_lock_lock, true) { loginDevice() }, matchWrap())
        body.addView(label("Không lưu mật khẩu · Không cần HQ duyệt · Thiết bị giả lập bị từ chối", 11.5f, false, muted).apply { gravity = Gravity.CENTER }, matchWrap(top = 16))
        val scroll = ScrollView(this).apply { isFillViewport = true; setBackgroundColor(canvasColor); addView(body) }
        setContentView(scroll)
    }

    private fun loginDevice() {
        val propertyCode = propertyCodeInput.text.toString().trim()
        val username = userInput.text.toString().trim()
        val password = passwordInput.text.toString()
        if (!propertyCode.matches(Regex("\\d{6}"))) return toast("Mã cơ sở phải gồm đúng 6 chữ số.")
        if (username.isBlank()) return toast("Hãy nhập tên đăng nhập.")
        if (password.isBlank()) return toast("Hãy nhập mật khẩu.")
        if (isProbablyEmulator()) return toast("Thiết bị giả lập không được phép đăng nhập.")
        toast("Đang đăng nhập…")
        runTask({ api.deviceLogin(apiBase, propertyCode, username, password, deviceId(), deviceName(), appVersion(), false) }) { result ->
            accessToken = result.optString("access_token")
            currentUser = result.optJSONObject("user") ?: JSONObject()
            getSharedPreferences("anio", MODE_PRIVATE).edit()
                .putString("property_code", propertyCode)
                .putString("username", username)
                .apply()
            credentialStore.save(result.optString("connection_id"), result.optString("device_secret"))
            passwordInput.setText("")
            loadBootstrap()
        }
    }

    private fun resumeDeviceSession(connectionId: String, deviceSecret: String) {
        val body = vertical().apply { gravity = Gravity.CENTER; setPadding(dp(24), dp(50), dp(24), dp(24)); setBackgroundColor(canvasColor) }
        body.addView(label("ANIO", 32f, true, ink).apply { gravity = Gravity.CENTER })
        body.addView(label("Đang xác thực thiết bị đã ghi nhận…", 14f, false, muted).apply { gravity = Gravity.CENTER }, matchWrap(top = 12))
        setContentView(body)
        executor.execute {
            try {
                val result = api.deviceRefresh(apiBase, connectionId, deviceSecret)
                runOnUiThread {
                    accessToken = result.optString("access_token")
                    currentUser = result.optJSONObject("user") ?: JSONObject()
                    loadBootstrap()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    toast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
                    clearDeviceSession()
                    showLogin()
                }
            }
        }
    }

    private fun clearDeviceSession() {
        accessToken = null
        currentUser = JSONObject()
        properties = JSONArray()
        capabilities = JSONArray()
        selectedPropertyId = null
        credentialStore.clear()
    }

    private fun loadBootstrap() {
        val token = accessToken ?: return showLogin()
        runTask({ api.bootstrap(apiBase, token, selectedPropertyId) }) { data ->
            properties = data.optJSONArray("properties") ?: JSONArray()
            capabilities = data.optJSONArray("capabilities") ?: JSONArray()
            selectedPropertyId = data.optString("current_property_id").takeIf { it.isNotBlank() }
                ?: currentUser.optString("property_id").takeIf { it.isNotBlank() }
            showPage(AppPage.DASHBOARD)
        }
    }

    private fun showPage(page: AppPage) {
        if (!pageAllowed(page)) return showPage(AppPage.DASHBOARD)
        currentPage = page
        val root = vertical().apply { setBackgroundColor(canvasColor) }
        val scroll = ScrollView(this).apply { isFillViewport = true }
        content = vertical().apply { setPadding(dp(16), dp(30), dp(16), dp(24)) }
        scroll.addView(content)
        root.addView(scroll, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        root.addView(bottomNavigation(), LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(if (compactLayout()) 82 else 76)))
        setContentView(root)
        when (page) {
            AppPage.DASHBOARD -> loadDashboard()
            AppPage.ROOMS -> loadRooms()
            AppPage.BOOKINGS -> loadBookings()
            AppPage.ALERTS -> loadAlerts()
            AppPage.ACCOUNT -> renderAccount()
        }
    }

    private fun header(title: String, showBell: Boolean = true) {
        val row = horizontal(Gravity.CENTER_VERTICAL)
        val left = vertical()
        left.addView(label(title, 30f, true, ink))
        val property = label(propertyName(), 16f, false, Color.rgb(47, 82, 150)).apply {
            setPadding(0, dp(3), dp(8), dp(3)); isClickable = true
            contentDescription = "Đổi cơ sở"
            setOnClickListener { chooseProperty() }
        }
        left.addView(property, matchWrap(top = 1))
        row.addView(left, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        if (showBell) {
            val bell = FrameLayout(this).apply {
                isClickable = true; isFocusable = true; contentDescription = "Mở cảnh báo"
                setOnClickListener { showPage(AppPage.ALERTS) }
            }
            bell.addView(AnioIconView(this, AnioIcon.BELL, primary), FrameLayout.LayoutParams(dp(38), dp(38), Gravity.CENTER))
            val badge = label(if (alertBadgeCount > 9) "9+" else alertBadgeCount.toString(), 10f, true, Color.WHITE).apply {
                gravity = Gravity.CENTER; background = background(danger, 12f)
                visibility = if (alertBadgeCount > 0) View.VISIBLE else View.GONE
            }
            bell.addView(badge, FrameLayout.LayoutParams(dp(22), dp(22), Gravity.TOP or Gravity.END))
            row.addView(bell, LinearLayout.LayoutParams(dp(54), dp(54)))
        }
        content.addView(row, matchWrap(bottom = 14))
    }

    private fun loadDashboard() {
        content.removeAllViews()
        header("Tổng quan")
        content.addView(label("Đang tải dữ liệu thực tế…", 13f, false, muted))
        val token = accessToken ?: return
        runTask({
            JSONObject().put("overview", api.overview(apiBase, token, selectedPropertyId))
                .put("queue", api.workQueue(apiBase, token, selectedPropertyId))
        }) { data -> renderDashboard(data.getJSONObject("overview"), data.getJSONObject("queue")) }
    }

    private fun renderDashboard(overview: JSONObject, queue: JSONObject) {
        content.removeAllViews()
        alertBadgeCount = (queue.optJSONArray("housekeeping")?.length() ?: 0) +
            (queue.optJSONArray("device_alerts")?.length() ?: 0) +
            (queue.optJSONArray("maintenance")?.length() ?: 0)
        header("Tổng quan")
        if (hasCapability("bookings")) addDashboardSearch()
        val summary = overview.optJSONObject("summary") ?: JSONObject()
        val counts = overview.optJSONObject("counts") ?: JSONObject()
        val rooms = counts.optJSONObject("rooms") ?: JSONObject()
        val totalRooms = listOf("VACANT", "OCCUPIED", "DIRTY", "MAINTENANCE").sumOf { rooms.optInt(it) }
        val occupied = rooms.optInt("OCCUPIED")
        val occupancy = if (totalRooms == 0) 0 else occupied * 100 / totalRooms
        val financial = summary.optJSONArray("financial_daily") ?: JSONArray()
        val todayRevenue = if (financial.length() == 0) 0.0 else financial.optJSONObject(financial.length() - 1)?.optDouble("revenue") ?: 0.0
        val queueCount = alertBadgeCount
        val kpis = mutableListOf(
            kpiCard("Công suất phòng", "$occupancy%", "$occupied/$totalRooms phòng", AnioIcon.BARS, success, Color.rgb(225, 249, 237)),
            kpiCard("Phòng đang ở", "$occupied phòng", "Trên tổng $totalRooms phòng", AnioIcon.BED, primary, Color.rgb(230, 242, 255)),
            kpiCard("Việc cần xử lý", "$queueCount việc", "Cảnh báo và bảo trì", AnioIcon.TASKS, warning, Color.rgb(255, 245, 211)),
        )
        if (hasCapability("finance")) kpis.add(1, kpiCard("Doanh thu hôm nay", money(todayRevenue), "Đã ghi nhận", AnioIcon.COINS, primary, Color.rgb(230, 239, 255)))
        addTwoColumnCards(kpis)

        val quickActions = mutableListOf<View>()
        if (hasCapability("bookings")) {
            quickActions += quickAction("Nhận phòng", AnioIcon.USER_ADD) { roomStatusFilter = "VACANT"; showPage(AppPage.ROOMS) }
            quickActions += quickAction("Đặt phòng", AnioIcon.CALENDAR) { pendingBookingRoomId = ""; showPage(AppPage.BOOKINGS) }
        }
        if (hasCapability("rooms")) quickActions += quickAction("Trạng thái\nphòng", AnioIcon.BED) { roomStatusFilter = null; showPage(AppPage.ROOMS) }
        if (hasCapability("maintenance")) quickActions += quickAction("Báo hỏng", AnioIcon.WRENCH) { openMaintenanceForm() }
        addQuickActionRow(quickActions)

        val roomCard = card()
        val roomHeader = horizontal(Gravity.CENTER_VERTICAL)
        roomHeader.addView(sectionTitle("Trạng thái phòng"), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        if (hasCapability("rooms")) roomHeader.addView(linkButton("Tình trạng phòng  ›") { showPage(AppPage.ROOMS) })
        roomCard.addView(roomHeader)
        val chartRow = horizontal(Gravity.CENTER_VERTICAL)
        chartRow.addView(RoomDonutView(this).apply { setCounts(rooms.optInt("VACANT"), occupied, rooms.optInt("DIRTY"), rooms.optInt("MAINTENANCE")) }, LinearLayout.LayoutParams(dp(132), dp(132)))
        val legend = vertical()
        addLegend(legend, "Trống", rooms.optInt("VACANT"), totalRooms, success)
        addLegend(legend, "Đang ở", occupied, totalRooms, primary)
        addLegend(legend, "Chờ dọn", rooms.optInt("DIRTY"), totalRooms, Color.rgb(250, 181, 5))
        addLegend(legend, "Bảo trì", rooms.optInt("MAINTENANCE"), totalRooms, danger)
        chartRow.addView(legend, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        roomCard.addView(chartRow)
        content.addView(roomCard, matchWrap(top = 12))

        if (hasCapability("finance")) {
        val financeCard = card()
        val financeHeader = horizontal(Gravity.CENTER_VERTICAL)
        financeHeader.addView(sectionTitle("Thu nhập & chi phí"), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        financeHeader.addView(chip("7 ngày ⌄", primary))
        financeCard.addView(financeHeader)
        val revenues = mutableListOf<Float>()
        val expenses = mutableListOf<Float>()
        val financialStart = (financial.length() - 7).coerceAtLeast(0)
        for (index in financialStart until financial.length()) {
            revenues.add(financial.optJSONObject(index)?.optDouble("revenue")?.toFloat() ?: 0f)
            expenses.add(financial.optJSONObject(index)?.optDouble("expense")?.toFloat() ?: 0f)
        }
        financeCard.addView(FinanceLineView(this).apply { setData(revenues, expenses) }, matchWrap(top = 8))
        val totals = horizontal(Gravity.CENTER_VERTICAL)
        totals.addView(label("● Thu nhập  ${money(revenues.sum().toDouble())}", 12f, true, primary), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        totals.addView(label("● Chi phí  ${money(expenses.sum().toDouble())}", 12f, true, danger), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        financeCard.addView(totals)
        content.addView(financeCard, matchWrap(top = 12))
        }

        val firstAlert = firstQueueItem(queue)
        val alertCard = card()
        val alertHeader = horizontal(Gravity.CENTER_VERTICAL)
        alertHeader.addView(sectionTitle("Cảnh báo cần xử lý"), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        if (pageAllowed(AppPage.ALERTS)) alertHeader.addView(linkButton("Xem tất cả ›") { showPage(AppPage.ALERTS) })
        alertCard.addView(alertHeader)
        if (firstAlert == null) alertCard.addView(label("Không có việc tồn đọng.", 13f, false, success), matchWrap(top = 10))
        else {
            val row = horizontal(Gravity.CENTER_VERTICAL)
            row.addView(label("!", 18f, true, Color.WHITE).apply {
                gravity = Gravity.CENTER; background = background(Color.rgb(248, 220, 225), 24f)
                setTextColor(danger)
            }, LinearLayout.LayoutParams(dp(46), dp(46)))
            val text = vertical().apply {
                addView(label(firstAlert.first, 13.5f, true, ink))
                addView(label(firstAlert.second, 11.5f, false, muted), matchWrap(top = 3))
            }
            row.addView(text, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(12) })
            row.addView(chip("Cần xử lý", danger))
            alertCard.addView(row, matchWrap(top = 10))
            if (pageAllowed(AppPage.ALERTS)) alertCard.setOnClickListener { showPage(AppPage.ALERTS) }
        }
        content.addView(alertCard, matchWrap(top = 12))
    }

    private fun addDashboardSearch() {
        val searchCard = card().apply { setPadding(dp(14), dp(5), dp(14), dp(5)) }
        val row = horizontal(Gravity.CENTER_VERTICAL)
        val searchIcon = AnioIconView(this, AnioIcon.SEARCH, Color.rgb(52, 91, 169)).apply {
            isClickable = true; isFocusable = true; contentDescription = "Tìm kiếm"
        }
        val input = field("Tìm khách hoặc mã đặt phòng", "").apply {
            setBackgroundColor(Color.TRANSPARENT); isSingleLine = true; imeOptions = EditorInfo.IME_ACTION_SEARCH
            setPadding(dp(8), 0, 0, 0); textSize = 15f
        }
        val results = vertical()
        fun performSearch() {
            val query = input.text.toString().trim()
            if (query.length < 2) return toast("Nhập ít nhất 2 ký tự.")
            val token = accessToken ?: return
            runTask({ api.search(apiBase, token, selectedPropertyId, query) }) { data ->
                results.removeAllViews()
                val customers = data.optJSONArray("customers") ?: JSONArray()
                val bookings = data.optJSONArray("bookings") ?: JSONArray()
                if (customers.length() + bookings.length() == 0) results.addView(label("Không tìm thấy kết quả phù hợp.", 12f, false, muted))
                for (index in 0 until minOf(customers.length(), 4)) {
                    val item = customers.getJSONObject(index)
                    results.addView(linkButton("Khách: ${item.optString("full_name")} · ${item.optString("phone")}") { showObjectDetails("Thông tin khách", item) })
                }
                for (index in 0 until minOf(bookings.length(), 4)) {
                    val item = bookings.getJSONObject(index)
                    results.addView(linkButton("${item.optString("code")} · ${item.optString("guest_name", "Chưa có tên")}") { openBookingDetails(item.optString("id")) })
                }
            }
        }
        searchIcon.setOnClickListener { performSearch() }
        input.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) { performSearch(); true } else false
        }
        row.addView(searchIcon, LinearLayout.LayoutParams(dp(42), dp(42)))
        row.addView(input, LinearLayout.LayoutParams(0, dp(54), 1f))
        searchCard.addView(row)
        searchCard.addView(results)
        content.addView(searchCard, matchWrap(bottom = 12))
    }

    private fun loadRooms() {
        content.removeAllViews()
        header("Phòng")
        content.addView(label("Đang tải danh sách phòng…", 13f, false, muted))
        val token = accessToken ?: return
        runTask({ api.rooms(apiBase, token, selectedPropertyId) }) { rooms -> lastRooms = rooms; renderRooms(rooms) }
    }

    private fun renderRooms(rooms: JSONArray) {
        content.removeAllViews()
        header("Phòng")
        val search = field("Tìm số phòng, tầng hoặc khu", "")
        val filters = Spinner(this)
        val filterLabels = listOf("Tất cả trạng thái", "Phòng trống", "Đang ở", "Chờ dọn", "Bảo trì")
        val filterValues = listOf<String?>(null, "VACANT", "OCCUPIED", "DIRTY", "MAINTENANCE")
        filters.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, filterLabels)
        filters.setSelection(filterValues.indexOf(roomStatusFilter).coerceAtLeast(0))
        val controls = card().apply { addView(search); addView(filters, matchWrap(top = 8)) }
        content.addView(controls, matchWrap(bottom = 10))
        val list = vertical()
        content.addView(list)
        fun applyFilter() {
            val query = search.text.toString().trim().lowercase(Locale.getDefault())
            val status = filterValues[filters.selectedItemPosition]
            list.removeAllViews()
            var visible = 0
            for (index in 0 until rooms.length()) {
                val room = rooms.getJSONObject(index)
                val haystack = "${room.optString("number")} ${room.optString("floor")} ${room.optString("zone")} ${room.optString("room_type_name")}".lowercase(Locale.getDefault())
                if ((status == null || room.optString("status") == status) && (query.isBlank() || haystack.contains(query))) {
                    list.addView(roomCard(room), matchWrap(bottom = 10)); visible++
                }
            }
            if (visible == 0) list.addView(emptyState("Không có phòng phù hợp."))
        }
        search.addTextChangedListener(simpleWatcher { applyFilter() })
        filters.onItemSelectedListener = simpleSelection { roomStatusFilter = filterValues[it]; applyFilter() }
        applyFilter()
    }

    private fun roomCard(room: JSONObject): View {
        val box = card()
        val top = horizontal(Gravity.CENTER_VERTICAL)
        val title = vertical()
        title.addView(label("Phòng ${room.optString("number")}", 18f, true, ink))
        title.addView(label("${room.optString("room_type_name")} · Tầng ${room.optString("floor")} · ${room.optString("zone")}", 12f, false, muted))
        top.addView(title, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        top.addView(chip(roomStatusLabel(room.optString("status")), roomStatusColor(room.optString("status"))))
        box.addView(top)
        val guest = room.optString("active_guest_name")
        if (guest.isNotBlank() && guest != "null") box.addView(label("Khách: $guest", 13f, true, ink), matchWrap(top = 8))
        box.addView(label("Giá hiện tại: ${money(room.optDouble("room_type_price"))} · Điện: ${if (room.optBoolean("power_on")) "Đang bật" else "Đang tắt"}", 12f, false, muted), matchWrap(top = 5))
        val actions = mutableListOf<Pair<String, () -> Unit>>()
        actions += "Xem chi tiết" to { showRoomDetails(room) }
        if (hasCapability("devices")) actions += (if (room.optBoolean("power_on")) "Tắt điện" else "Bật điện") to { changeRoomPower(room) }
        when (room.optString("status")) {
            "VACANT" -> if (hasCapability("bookings")) actions += "Nhận phòng" to { pendingBookingRoomId = room.optString("id"); showPage(AppPage.BOOKINGS) }
            "OCCUPIED" -> if (hasCapability("bookings")) room.optString("active_booking_id").takeIf { it.isNotBlank() && it != "null" }?.let { id -> actions += "Xem lưu trú" to { openBookingDetails(id) } }
            "DIRTY" -> if (hasCapability("housekeeping") || currentUser.optString("role") in setOf("OWNER", "MANAGER")) actions += "Đã dọn xong" to { completeRoom(room) }
            "MAINTENANCE" -> if (pageAllowed(AppPage.ALERTS)) actions += "Xem cảnh báo" to { showPage(AppPage.ALERTS) }
        }
        if (hasCapability("maintenance")) actions += "Báo hỏng" to { openMaintenanceForm(room.optString("id")) }
        addActionGrid(box, actions)
        return box
    }

    private fun showRoomDetails(room: JSONObject) {
        val message = "Số phòng: ${room.optString("number")}\nLoại phòng: ${room.optString("room_type_name")}\nTầng: ${room.optString("floor")}\nKhu: ${room.optString("zone")}\nTrạng thái: ${roomStatusLabel(room.optString("status"))}\nĐiện: ${if (room.optBoolean("power_on")) "Đang bật" else "Đang tắt"}\nMã phòng: ${room.optString("room_code")}\nGhi chú: ${room.optString("note").takeIf { it.isNotBlank() && it != "null" } ?: "Không có"}"
        AlertDialog.Builder(this).setTitle("Phòng ${room.optString("number")}").setMessage(message)
            .setPositiveButton("Đóng", null).setNeutralButton("Báo hỏng") { _, _ -> openMaintenanceForm(room.optString("id")) }.show()
    }

    private fun changeRoomPower(room: JSONObject) {
        val turnOn = !room.optBoolean("power_on")
        confirm(if (turnOn) "Bật điện phòng ${room.optString("number")}?" else "Tắt điện phòng ${room.optString("number")}?" ) {
            val token = accessToken ?: return@confirm
            runTask({ api.setRoomPower(apiBase, token, selectedPropertyId, room.getString("id"), turnOn) }) {
                toast(if (turnOn) "Đã gửi lệnh bật điện." else "Đã gửi lệnh tắt điện."); loadRooms()
            }
        }
    }

    private fun completeRoom(room: JSONObject) {
        confirm("Xác nhận phòng ${room.optString("number")} đã dọn xong?") {
            val token = accessToken ?: return@confirm
            runTask({ api.completeHousekeeping(apiBase, token, selectedPropertyId, room.getString("id")) }) { toast("Phòng đã chuyển sang trạng thái trống."); loadRooms() }
        }
    }

    private fun loadBookings() {
        content.removeAllViews()
        header("Đặt phòng")
        content.addView(label("Đang tải danh sách đặt phòng…", 13f, false, muted))
        val token = accessToken ?: return
        runTask({ api.bookings(apiBase, token, selectedPropertyId) }) { bookings ->
            renderBookings(bookings)
            if (pendingBookingRoomId != null) {
                val prefill = pendingBookingRoomId
                pendingBookingRoomId = null
                openCreateBooking(prefill)
            }
        }
    }

    private fun renderBookings(bookings: JSONArray) {
        content.removeAllViews()
        header("Đặt phòng")
        content.addView(actionButton("Tạo đặt phòng mới", android.R.drawable.ic_input_add, true) { openCreateBooking() }, matchWrap(bottom = 10))
        val search = field("Tìm mã đặt phòng hoặc tên khách", "")
        content.addView(search, matchWrap(bottom = 10))
        val list = vertical()
        content.addView(list)
        fun applyFilter() {
            val query = search.text.toString().trim().lowercase(Locale.getDefault())
            list.removeAllViews(); var count = 0
            for (index in 0 until bookings.length()) {
                val booking = bookings.getJSONObject(index)
                val haystack = "${booking.optString("code")} ${booking.optString("guest_name")} ${booking.optString("room_number")}".lowercase(Locale.getDefault())
                if (query.isBlank() || haystack.contains(query)) { list.addView(bookingCard(booking), matchWrap(bottom = 10)); count++ }
            }
            if (count == 0) list.addView(emptyState("Không có đặt phòng phù hợp."))
        }
        search.addTextChangedListener(simpleWatcher { applyFilter() })
        applyFilter()
    }

    private fun bookingCard(booking: JSONObject): View {
        val box = card()
        val top = horizontal(Gravity.CENTER_VERTICAL)
        val title = vertical()
        title.addView(label(booking.optString("code"), 16f, true, ink))
        title.addView(label(booking.optString("guest_name").takeIf { it.isNotBlank() && it != "null" } ?: "Chưa có tên khách", 13f, false, muted))
        top.addView(title, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        top.addView(chip(bookingStatusLabel(booking.optString("status")), bookingStatusColor(booking.optString("status"))))
        box.addView(top)
        box.addView(label("Phòng ${booking.optString("room_number", "—")} · ${shortDate(booking.optString("checkin_date"))} → ${shortDate(booking.optString("checkout_date"))}", 12f, false, muted), matchWrap(top = 8))
        box.addView(label("Tổng tiền ${money(booking.optDouble("total_price"))} · Cọc ${money(booking.optDouble("deposit"))}", 12f, true, ink), matchWrap(top = 4))
        val id = booking.optString("id")
        val actions = mutableListOf<Pair<String, () -> Unit>>("Xem chi tiết" to { openBookingDetails(id) })
        when (booking.optString("status")) {
            "PENDING" -> {
                actions += "Khách sẽ đến" to { bookingAction(id, "arrival-confirmation", JSONObject().put("willArrive", true), "Đã xác nhận khách sẽ đến.") }
                actions += "Khách không đến" to { markNoShow(id) }
            }
            "CONFIRMED" -> actions += "Nhận phòng" to { bookingAction(id, "checkin", JSONObject(), "Đã nhận phòng và gửi lệnh cấp điện.") }
            "CHECKED_IN" -> {
                actions += "Khách ra ngoài" to { bookingAction(id, "guest-out", JSONObject(), "Đã ghi nhận khách ra ngoài và gửi lệnh ngắt điện.") }
                actions += "Khách về phòng" to { bookingAction(id, "guest-return", JSONObject(), "Đã ghi nhận khách về và gửi lệnh cấp điện.") }
                actions += "Thanh toán & trả" to { settleBooking(id) }
            }
        }
        addActionGrid(box, actions)
        return box
    }

    private fun openBookingDetails(id: String) {
        val token = accessToken ?: return
        runTask({ api.booking(apiBase, token, selectedPropertyId, id) }) { item ->
            val message = "Mã: ${item.optString("code")}\nKhách: ${item.optString("guest_name", "Chưa có tên")}\nPhòng: ${item.optString("room_number", "Chưa gán")}\nTrạng thái: ${bookingStatusLabel(item.optString("status"))}\nNhận: ${shortDate(item.optString("checkin_date"))}\nTrả: ${shortDate(item.optString("checkout_date"))}\nHình thức ở: ${stayTypeLabel(item.optString("stay_type"))}\nTổng tiền: ${money(item.optDouble("total_price"))}\nĐặt cọc: ${money(item.optDouble("deposit"))}\nGhi chú: ${item.optString("notes").takeIf { it.isNotBlank() && it != "null" } ?: "Không có"}"
            AlertDialog.Builder(this).setTitle("Chi tiết đặt phòng").setMessage(message).setPositiveButton("Đóng", null).show()
        }
    }

    private fun openCreateBooking(preselectedRoomId: String? = null) {
        val token = accessToken ?: return
        runTask({ api.rooms(apiBase, token, selectedPropertyId) }) { rooms ->
            lastRooms = rooms
            val available = mutableListOf<JSONObject>()
            for (index in 0 until rooms.length()) if (rooms.getJSONObject(index).optString("status") == "VACANT") available.add(rooms.getJSONObject(index))
            if (available.isEmpty()) return@runTask toast("Hiện không có phòng trống để đặt.")
            val layout = vertical().apply { setPadding(dp(20), dp(8), dp(20), dp(4)) }
            val guest = field("Họ tên khách *", "")
            val phone = field("Số điện thoại", "")
            val roomSpinner = Spinner(this).apply { adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, available.map { "Phòng ${it.optString("number")} · ${it.optString("room_type_name")} · ${money(it.optDouble("room_type_price"))}" }) }
            preselectedRoomId?.takeIf { it.isNotBlank() }?.let { wanted -> roomSpinner.setSelection(available.indexOfFirst { it.optString("id") == wanted }.coerceAtLeast(0)) }
            val checkin = field("Ngày nhận YYYY-MM-DD *", LocalDate.now().format(DateTimeFormatter.ISO_DATE))
            val checkout = field("Ngày trả YYYY-MM-DD *", LocalDate.now().plusDays(1).format(DateTimeFormatter.ISO_DATE))
            val price = field("Tổng tiền", available[roomSpinner.selectedItemPosition].optString("room_type_price", "0"), false, true)
            val staySpinner = Spinner(this).apply { adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("Theo ngày", "Qua đêm", "Theo giờ")) }
            roomSpinner.onItemSelectedListener = simpleSelection { price.setText(available[it].optString("room_type_price", "0")) }
            listOf(guest, phone, roomSpinner, checkin, checkout, price, staySpinner).forEach { layout.addView(it, matchWrap(bottom = 6)) }
            val dialog = AlertDialog.Builder(this).setTitle("Tạo đặt phòng").setView(ScrollView(this).apply { addView(layout) })
                .setNegativeButton("Hủy", null).setPositiveButton("Lưu", null).create()
            dialog.setOnShowListener {
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                    val fullName = guest.text.toString().trim()
                    val checkinValue = checkin.text.toString().trim()
                    val checkoutValue = checkout.text.toString().trim()
                    val totalPrice = price.text.toString().replace(".", "").replace(",", "").toDoubleOrNull()
                    if (fullName.isBlank() || !validDate(checkinValue) || !validDate(checkoutValue) || totalPrice == null || totalPrice < 0) return@setOnClickListener toast("Kiểm tra họ tên, ngày nhận/trả và tổng tiền.")
                    if (checkoutValue <= checkinValue) return@setOnClickListener toast("Ngày trả phải sau ngày nhận.")
                    val room = available[roomSpinner.selectedItemPosition]
                    val stayType = listOf("DAILY", "OVERNIGHT", "HOURLY")[staySpinner.selectedItemPosition]
                    runTask({
                        val customer = api.createCustomer(apiBase, token, selectedPropertyId, fullName, phone.text.toString().trim())
                        api.createBooking(apiBase, token, selectedPropertyId, JSONObject()
                            .put("customerId", customer.getString("id")).put("roomId", room.getString("id"))
                            .put("channel", "DIRECT").put("status", "PENDING")
                            .put("checkinDate", checkinValue).put("checkoutDate", checkoutValue)
                            .put("stayType", stayType).put("totalPrice", totalPrice).put("deposit", 0))
                    }) { dialog.dismiss(); toast("Đã tạo đặt phòng."); loadBookings() }
                }
            }
            dialog.show()
        }
    }

    private fun bookingAction(id: String, action: String, body: JSONObject, successMessage: String) {
        val token = accessToken ?: return
        runTask({ api.bookingAction(apiBase, token, selectedPropertyId, id, action, body) }) { toast(successMessage); loadBookings() }
    }

    private fun markNoShow(id: String) {
        val reason = field("Lý do khách không đến *", "")
        AlertDialog.Builder(this).setTitle("Khách không đến").setView(reason).setNegativeButton("Hủy", null)
            .setPositiveButton("Xác nhận") { _, _ ->
                val value = reason.text.toString().trim()
                if (value.length < 3) toast("Cần nhập lý do rõ ràng.")
                else bookingAction(id, "arrival-confirmation", JSONObject().put("willArrive", false).put("reason", value), "Đã ghi nhận khách không đến.")
            }.show()
    }

    private fun settleBooking(id: String) {
        val token = accessToken ?: return
        runTask({ api.settlementPreview(apiBase, token, selectedPropertyId, id) }) { preview ->
            val invoice = preview.optJSONObject("invoice") ?: return@runTask toast("Không lập được phiếu xác nhận.")
            val amount = preview.optDouble("amountDue")
            AlertDialog.Builder(this).setTitle("Xác nhận thanh toán")
                .setMessage("Phiếu: ${invoice.optString("code")}\nSố tiền cần thu: ${money(amount)}\nHình thức: Tiền mặt\n\nChỉ chốt sau khi khách đã xác nhận và đã thu hồi thẻ phòng.")
                .setNegativeButton("Để sau", null).setPositiveButton("Đã thu tiền, trả phòng") { _, _ ->
                    runTask({ api.settlementFinalize(apiBase, token, selectedPropertyId, id, invoice.getString("id")) }) { toast("Đã chốt doanh thu và trả phòng. Phòng chuyển sang chờ dọn."); loadBookings() }
                }.show()
        }
    }

    private fun loadAlerts() {
        content.removeAllViews(); header("Thông báo & cảnh báo", false)
        content.addView(label("Đang tải việc cần xử lý…", 13f, false, muted))
        val token = accessToken ?: return
        runTask({ api.workQueue(apiBase, token, selectedPropertyId) }) { queue -> renderAlerts(queue) }
    }

    private fun renderAlerts(queue: JSONObject) {
        content.removeAllViews(); header("Thông báo & cảnh báo", false)
        content.addView(actionButton("Báo hỏng mới", android.R.drawable.ic_input_add, true) { openMaintenanceForm() }, matchWrap(bottom = 10))
        content.addView(actionButton("Làm mới", android.R.drawable.ic_popup_sync, false) { loadAlerts() }, matchWrap(bottom = 12))
        val devices = queue.optJSONArray("device_alerts") ?: JSONArray()
        val housekeeping = queue.optJSONArray("housekeeping") ?: JSONArray()
        val maintenance = queue.optJSONArray("maintenance") ?: JSONArray()
        content.addView(sectionTitle("Thiết bị mất kết nối hoặc báo lỗi (${devices.length()})"), matchWrap(bottom = 8))
        if (devices.length() == 0) content.addView(emptyState("Tất cả thiết bị đang hoạt động bình thường."))
        for (index in 0 until devices.length()) {
            val device = devices.getJSONObject(index)
            val box = alertItem(device.optString("name"), "Trạng thái: ${deviceStatusLabel(device.optString("status"))}", danger)
            box.addView(linkButton("Xem chi tiết") { showObjectDetails("Chi tiết thiết bị", device) }, matchWrap(top = 6))
            content.addView(box, matchWrap(bottom = 8))
        }
        content.addView(sectionTitle("Phòng chờ dọn (${housekeeping.length()})"), matchWrap(top = 10, bottom = 8))
        if (housekeeping.length() == 0) content.addView(emptyState("Không có phòng đang chờ dọn."))
        for (index in 0 until housekeeping.length()) {
            val room = housekeeping.getJSONObject(index)
            val box = alertItem("Phòng ${room.optString("number")} cần dọn", "Tầng ${room.optString("floor")} · ${room.optString("zone")}", warning)
            addActionGrid(box, listOf("Xem phòng" to { showRoomDetails(room) }, "Đã dọn xong" to { completeRoomFromAlerts(room) }))
            content.addView(box, matchWrap(bottom = 8))
        }
        content.addView(sectionTitle("Yêu cầu bảo trì (${maintenance.length()})"), matchWrap(top = 10, bottom = 8))
        if (maintenance.length() == 0) content.addView(emptyState("Không có yêu cầu bảo trì đang mở."))
        for (index in 0 until maintenance.length()) {
            val item = maintenance.getJSONObject(index)
            val box = alertItem(item.optString("category", "Yêu cầu sửa chữa"), item.optString("description"), if (item.optString("priority") == "URGENT") danger else warning)
            val actions = mutableListOf<Pair<String, () -> Unit>>("Xem chi tiết" to { showObjectDetails("Phiếu bảo trì", item) })
            if (item.optString("status") == "OPEN") actions += "Bắt đầu xử lý" to { updateMaintenance(item.optString("id"), "IN_PROGRESS") }
            if (item.optString("status") == "IN_PROGRESS") actions += "Hoàn tất" to { updateMaintenance(item.optString("id"), "COMPLETED") }
            addActionGrid(box, actions)
            content.addView(box, matchWrap(bottom = 8))
        }
    }

    private fun completeRoomFromAlerts(room: JSONObject) {
        confirm("Xác nhận phòng ${room.optString("number")} đã dọn xong?") {
            val token = accessToken ?: return@confirm
            runTask({ api.completeHousekeeping(apiBase, token, selectedPropertyId, room.getString("id")) }) { toast("Đã hoàn tất dọn phòng."); loadAlerts() }
        }
    }

    private fun updateMaintenance(id: String, status: String) {
        val token = accessToken ?: return
        runTask({ api.updateMaintenanceStatus(apiBase, token, selectedPropertyId, id, status) }) { toast(if (status == "COMPLETED") "Đã hoàn tất yêu cầu." else "Đã chuyển sang đang xử lý."); loadAlerts() }
    }

    private fun openMaintenanceForm(preselectedRoomId: String? = null) {
        val token = accessToken ?: return
        runTask({ api.rooms(apiBase, token, selectedPropertyId) }) { rooms ->
            lastRooms = rooms
            if (rooms.length() == 0) return@runTask toast("Chưa có phòng để lập yêu cầu.")
            val roomList = (0 until rooms.length()).map { rooms.getJSONObject(it) }
            val layout = vertical().apply { setPadding(dp(20), dp(8), dp(20), 0) }
            val roomSpinner = Spinner(this).apply { adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, roomList.map { "Phòng ${it.optString("number")} · ${it.optString("zone")}" }) }
            preselectedRoomId?.let { wanted -> roomSpinner.setSelection(roomList.indexOfFirst { it.optString("id") == wanted }.coerceAtLeast(0)) }
            val category = field("Loại lỗi *", "Điện/thiết bị")
            val description = field("Mô tả chi tiết *", "").apply { minLines = 3; gravity = Gravity.TOP }
            val priority = Spinner(this).apply { adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("Bình thường", "Cao", "Khẩn cấp", "Thấp")) }
            listOf(roomSpinner, category, description, priority).forEach { layout.addView(it, matchWrap(bottom = 6)) }
            val dialog = AlertDialog.Builder(this).setTitle("Báo hỏng & yêu cầu sửa").setView(ScrollView(this).apply { addView(layout) })
                .setNegativeButton("Hủy", null).setPositiveButton("Gửi yêu cầu", null).create()
            dialog.setOnShowListener {
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                    val categoryValue = category.text.toString().trim()
                    val descriptionValue = description.text.toString().trim()
                    if (categoryValue.length < 2 || descriptionValue.length < 3) return@setOnClickListener toast("Hãy nhập loại lỗi và mô tả chi tiết.")
                    val priorityValue = listOf("NORMAL", "HIGH", "URGENT", "LOW")[priority.selectedItemPosition]
                    val room = roomList[roomSpinner.selectedItemPosition]
                    val issue = JSONObject().put("category", categoryValue).put("description", descriptionValue).put("priority", priorityValue)
                    val body = JSONObject().put("roomId", room.getString("id")).put("category", categoryValue)
                        .put("description", descriptionValue).put("priority", priorityValue)
                        .put("guestVisible", true).put("markRoomMaintenance", priorityValue == "URGENT")
                        .put("issues", JSONArray().put(issue))
                    runTask({ api.createMaintenance(apiBase, token, selectedPropertyId, body) }) {
                        dialog.dismiss(); toast("Đã gửi yêu cầu sửa chữa.")
                        if (currentPage == AppPage.ALERTS) loadAlerts()
                    }
                }
            }
            dialog.show()
        }
    }

    private fun renderAccount() {
        content.removeAllViews(); header("Tài khoản", false)
        val profile = card()
        profile.addView(label(currentUser.optString("full_name", "Người dùng"), 21f, true, ink))
        profile.addView(label(roleLabel(currentUser.optString("role")), 14f, true, primary), matchWrap(top = 4))
        profile.addView(label("Tên đăng nhập: ${currentUser.optString("username", "—")}", 13f, false, muted), matchWrap(top = 10))
        profile.addView(label("Email: ${currentUser.optString("email", "—")}", 13f, false, muted), matchWrap(top = 4))
        content.addView(profile, matchWrap(bottom = 12))

        val propertyCard = card()
        propertyCard.addView(sectionTitle("Cơ sở đang quản lý"))
        propertyCard.addView(label(propertyName(), 16f, true, ink), matchWrap(top = 8, bottom = 8))
        propertyCard.addView(actionButton("Đổi cơ sở", android.R.drawable.ic_menu_mapmode, false) { chooseProperty() })
        content.addView(propertyCard, matchWrap(bottom = 12))

        val connection = card()
        connection.addView(sectionTitle("Kết nối máy chủ"))
        connection.addView(label("Thiết bị đã được ghi nhận", 15f, true, success), matchWrap(top = 8))
        connection.addView(label("Lần đăng nhập đầu tiên đã xác thực bằng mật khẩu. Thiết bị sẽ tự kết nối lại cho đến khi người dùng đăng xuất hoặc HQ thu hồi phiên.", 12.5f, false, muted), matchWrap(top = 5, bottom = 10))
        connection.addView(actionButton("Kiểm tra kết nối", android.R.drawable.ic_popup_sync, false) {
            val token = accessToken ?: return@actionButton
            runTask({ api.me(apiBase, token, selectedPropertyId) }) { toast("Kết nối thành công với ${it.optString("full_name", "máy chủ PMS")}.") }
        }, matchWrap(top = 8))
        content.addView(connection, matchWrap(bottom = 12))
        content.addView(actionButton("Làm mới toàn bộ dữ liệu", android.R.drawable.ic_popup_sync, false) { loadBootstrap() }, matchWrap(bottom = 8))
        content.addView(actionButton("Đăng xuất", android.R.drawable.ic_lock_power_off, false) {
            confirm("Gỡ phiên đăng nhập khỏi thiết bị này?") { clearDeviceSession(); showLogin() }
        })
        content.addView(label("ANIO Vận hành · phiên bản ${appVersion()}", 11f, false, muted).apply { gravity = Gravity.CENTER }, matchWrap(top = 18))
    }

    private fun chooseProperty() {
        if (properties.length() <= 1) return toast("Tài khoản hiện chỉ quản lý một cơ sở.")
        val names = (0 until properties.length()).map { properties.getJSONObject(it).optString("name") }.toTypedArray()
        AlertDialog.Builder(this).setTitle("Chọn cơ sở").setItems(names) { _, index -> selectedPropertyId = properties.getJSONObject(index).optString("id"); showPage(currentPage) }.setNegativeButton("Đóng", null).show()
    }

    private fun propertyName(): String {
        for (index in 0 until properties.length()) {
            val item = properties.optJSONObject(index) ?: continue
            if (item.optString("id") == selectedPropertyId) return item.optString("name", "Cơ sở lưu trú") + " ⌄"
        }
        return "Cơ sở lưu trú ⌄"
    }

    private fun bottomNavigation(): View {
        val compact = compactLayout()
        val bar = horizontal(Gravity.CENTER).apply {
            setPadding(dp(4), dp(5), dp(4), dp(3)); background = background(surface, 0f, Color.rgb(233, 237, 246))
            elevation = dp(8).toFloat()
        }
        val items = listOf(
            Triple(AppPage.DASHBOARD, "Trang chủ", AnioIcon.HOME),
            Triple(AppPage.ROOMS, "Phòng", AnioIcon.BED),
            Triple(AppPage.BOOKINGS, "Đặt phòng", AnioIcon.CALENDAR),
            Triple(AppPage.ALERTS, "Cảnh báo", AnioIcon.BELL),
            Triple(AppPage.ACCOUNT, "Tài khoản", AnioIcon.USER),
        ).filter { pageAllowed(it.first) }
        items.forEach { (page, title, icon) ->
            val active = page == currentPage
            val item = vertical().apply {
                gravity = Gravity.CENTER; isClickable = true; isFocusable = true
                contentDescription = "Mở $title"
                setOnClickListener { if (!active) showPage(page) }
            }
            val iconHolder = FrameLayout(this)
            val navIconSize = dp(if (compact) 29 else 32)
            iconHolder.addView(AnioIconView(this, icon, if (active) primary else muted), FrameLayout.LayoutParams(navIconSize, navIconSize, Gravity.CENTER))
            if (page == AppPage.ALERTS && alertBadgeCount > 0) {
                val badge = label(if (alertBadgeCount > 9) "9+" else alertBadgeCount.toString(), 8.5f, true, Color.WHITE).apply {
                    gravity = Gravity.CENTER; background = background(danger, 10f)
                }
                iconHolder.addView(badge, FrameLayout.LayoutParams(dp(19), dp(19), Gravity.TOP or Gravity.END))
            }
            item.addView(iconHolder, LinearLayout.LayoutParams(dp(40), dp(36)))
            item.addView(autoText(label(title, 10.5f, active, if (active) primary else muted).apply { gravity = Gravity.CENTER }, 8f, 10.5f, 1))
            bar.addView(item, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f))
        }
        return bar
    }

    private fun kpiCard(title: String, value: String, detail: String, icon: AnioIcon, accent: Int, iconBackground: Int): View = card().apply {
        val compact = compactLayout()
        setPadding(dp(if (compact) 9 else 12), dp(10), dp(if (compact) 8 else 10), dp(10))
        val row = horizontal(Gravity.CENTER_VERTICAL)
        val iconBox = FrameLayout(this@MainActivity).apply { background = background(iconBackground, 13f) }
        val iconBoxSize = dp(if (compact) 44 else 50)
        val glyphSize = dp(if (compact) 29 else 32)
        iconBox.addView(AnioIconView(this@MainActivity, icon, accent), FrameLayout.LayoutParams(glyphSize, glyphSize, Gravity.CENTER))
        row.addView(iconBox, LinearLayout.LayoutParams(iconBoxSize, iconBoxSize))
        val text = vertical().apply {
            addView(autoText(label(title, 11.5f, false, Color.rgb(53, 72, 119)), 9f, 11.5f, 2))
            addView(autoText(label(value, if (value.length > 12) 17f else 21f, true, ink), 14f, if (value.length > 12) 17f else 21f, 1), matchWrap(top = 1))
            addView(autoText(label(detail, 10.5f, false, if (accent == warning) danger else muted), 8.5f, 10.5f, 2), matchWrap(top = 1))
        }
        row.addView(text, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(if (compact) 8 else 11) })
        addView(row)
    }

    private fun quickAction(title: String, icon: AnioIcon, action: () -> Unit): View = vertical().apply {
        val compact = compactLayout()
        gravity = Gravity.CENTER; setPadding(dp(3), dp(8), dp(3), dp(7)); background = background(surface, 14f)
        elevation = dp(1).toFloat(); isClickable = true; isFocusable = true; contentDescription = title.replace("\n", " ")
        setOnClickListener { action() }
        val iconBox = FrameLayout(this@MainActivity).apply { background = background(primary, 13f) }
        val boxSize = dp(if (compact) 50 else 56)
        val glyphSize = dp(if (compact) 32 else 36)
        iconBox.addView(AnioIconView(this@MainActivity, icon, Color.WHITE), FrameLayout.LayoutParams(glyphSize, glyphSize, Gravity.CENTER))
        addView(iconBox, LinearLayout.LayoutParams(boxSize, boxSize))
        addView(autoText(label(title, 11f, true, ink).apply { gravity = Gravity.CENTER }, 8.5f, 11f, 2), matchWrap(top = 6))
    }

    private fun addQuickActionRow(actions: List<View>) {
        val compact = compactLayout()
        val row = horizontal().apply { weightSum = actions.size.toFloat() }
        actions.forEachIndexed { index, action ->
            row.addView(action, LinearLayout.LayoutParams(0, dp(if (compact) 104 else 112), 1f).apply {
                leftMargin = if (index == 0) 0 else dp(3)
                rightMargin = if (index == actions.lastIndex) 0 else dp(3)
            })
        }
        content.addView(row, matchWrap(bottom = 14))
    }

    private fun alertItem(title: String, detail: String, accent: Int): LinearLayout = card().apply {
        val row = horizontal(Gravity.CENTER_VERTICAL)
        row.addView(label("!", 18f, true, Color.WHITE).apply { gravity = Gravity.CENTER; background = background(accent, 24f) }, LinearLayout.LayoutParams(dp(42), dp(42)))
        val texts = vertical().apply { addView(label(title, 14f, true, ink)); addView(label(detail, 12f, false, muted), matchWrap(top = 3)) }
        row.addView(texts, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(12) }); addView(row)
    }

    private fun addTwoColumnCards(views: List<View>) {
        val cardHeight = dp(if (compactLayout()) 104 else 88)
        views.chunked(2).forEach { pair ->
            val row = horizontal().apply { weightSum = 2f }
            pair.forEachIndexed { index, view -> row.addView(view, LinearLayout.LayoutParams(0, cardHeight, 1f).apply { if (index == 0) marginEnd = dp(6) else marginStart = dp(6) }) }
            if (pair.size == 1) row.addView(Space(this), LinearLayout.LayoutParams(0, 1, 1f))
            content.addView(row, matchWrap(bottom = 10))
        }
    }

    private fun addActionGrid(parent: LinearLayout, actions: List<Pair<String, () -> Unit>>) {
        val holder = vertical()
        actions.chunked(2).forEach { pair ->
            val row = horizontal().apply { weightSum = 2f }
            pair.forEachIndexed { index, item -> row.addView(actionButton(item.first, 0, false, item.second), LinearLayout.LayoutParams(0, dp(if (compactLayout()) 52 else 46), 1f).apply { if (index == 0) marginEnd = dp(4) else marginStart = dp(4) }) }
            if (pair.size == 1) row.addView(Space(this), LinearLayout.LayoutParams(0, 1, 1f))
            holder.addView(row, matchWrap(bottom = 6))
        }
        parent.addView(holder, matchWrap(top = 10))
    }

    private fun addLegend(parent: LinearLayout, title: String, value: Int, total: Int, color: Int) {
        val pct = if (total == 0) 0 else value * 100 / total
        val row = horizontal(Gravity.CENTER_VERTICAL)
        row.addView(label("●", 14f, true, color), LinearLayout.LayoutParams(dp(22), ViewGroup.LayoutParams.WRAP_CONTENT))
        row.addView(label(title, 12f, false, ink), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(label("$value  $pct%", 12f, true, muted)); parent.addView(row)
    }

    private fun firstQueueItem(queue: JSONObject): Pair<String, String>? {
        val devices = queue.optJSONArray("device_alerts") ?: JSONArray()
        if (devices.length() > 0) return devices.getJSONObject(0).optString("name", "Thiết bị mất kết nối") to "Chạm để xem và xử lý"
        val housekeeping = queue.optJSONArray("housekeeping") ?: JSONArray()
        if (housekeeping.length() > 0) return "Phòng ${housekeeping.getJSONObject(0).optString("number")} chờ dọn" to "Bộ phận buồng phòng cần xử lý"
        val maintenance = queue.optJSONArray("maintenance") ?: JSONArray()
        if (maintenance.length() > 0) return maintenance.getJSONObject(0).optString("category", "Yêu cầu bảo trì") to maintenance.getJSONObject(0).optString("description")
        return null
    }

    private fun showObjectDetails(title: String, item: JSONObject) {
        val lines = item.keys().asSequence().filterNot { it.endsWith("_id") || it in setOf("tenant_id", "property_id", "qr_token") }
            .take(14).joinToString("\n") { key -> "${friendlyKey(key)}: ${item.opt(key)}" }
        AlertDialog.Builder(this).setTitle(title).setMessage(lines.ifBlank { "Không có thông tin chi tiết." }).setPositiveButton("Đóng", null).show()
    }

    private fun friendlyKey(key: String): String = mapOf(
        "name" to "Tên", "status" to "Trạng thái", "device_type" to "Loại thiết bị", "external_id" to "Mã thiết bị", "category" to "Hạng mục",
        "description" to "Mô tả", "priority" to "Mức ưu tiên", "created_at" to "Thời gian tạo", "number" to "Số phòng", "floor" to "Tầng",
        "zone" to "Khu", "power_on" to "Điện phòng",
    )[key] ?: key.replace('_', ' ')

    private fun roomStatusLabel(status: String) = mapOf("VACANT" to "Trống", "OCCUPIED" to "Đang ở", "DIRTY" to "Chờ dọn", "MAINTENANCE" to "Bảo trì")[status] ?: status
    private fun roomStatusColor(status: String) = mapOf("VACANT" to success, "OCCUPIED" to primary, "DIRTY" to warning, "MAINTENANCE" to danger)[status] ?: muted
    private fun bookingStatusLabel(status: String) = mapOf("PENDING" to "Chờ xác nhận", "CONFIRMED" to "Đã xác nhận", "CHECKED_IN" to "Đang ở", "CHECKED_OUT" to "Đã trả phòng", "CANCELLED" to "Đã hủy", "NO_SHOW" to "Không đến")[status] ?: status
    private fun bookingStatusColor(status: String) = mapOf("PENDING" to warning, "CONFIRMED" to primary, "CHECKED_IN" to success, "CHECKED_OUT" to muted, "CANCELLED" to danger, "NO_SHOW" to danger)[status] ?: muted
    private fun deviceStatusLabel(status: String) = mapOf("ONLINE" to "Đang kết nối", "OFFLINE" to "Mất kết nối", "ERROR" to "Báo lỗi")[status] ?: status
    private fun stayTypeLabel(value: String) = mapOf("DAILY" to "Theo ngày", "OVERNIGHT" to "Qua đêm", "HOURLY" to "Theo giờ")[value] ?: value
    private fun roleLabel(value: String) = mapOf("OWNER" to "Chủ cơ sở", "MANAGER" to "Quản lý", "RECEPTIONIST" to "Lễ tân", "HOUSEKEEPING" to "Buồng phòng", "TECHNICIAN" to "Kỹ thuật viên")[value] ?: value
    private fun hasCapability(value: String): Boolean = (0 until capabilities.length()).any { capabilities.optString(it) == value }
    private fun pageAllowed(page: AppPage): Boolean = when (page) {
        AppPage.DASHBOARD, AppPage.ACCOUNT -> true
        AppPage.ROOMS -> hasCapability("rooms")
        AppPage.BOOKINGS -> hasCapability("bookings")
        AppPage.ALERTS -> hasCapability("maintenance") || hasCapability("devices") || hasCapability("housekeeping")
    }
    private fun defaultApiBase(): String {
        val emulator = Build.FINGERPRINT.lowercase(Locale.getDefault()).contains("generic") ||
            Build.MODEL.lowercase(Locale.getDefault()).contains("emulator") ||
            Build.MODEL.lowercase(Locale.getDefault()).contains("sdk_gphone")
        return if (emulator) "http://10.0.2.2:3100/api/backend" else "http://sonanio25:3100/api/backend"
    }
    private fun deviceId(): String = "android-${Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown-device"}"
    private fun deviceName(): String = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
    private fun isProbablyEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT.lowercase(Locale.getDefault())
        val model = Build.MODEL.lowercase(Locale.getDefault())
        val product = Build.PRODUCT.lowercase(Locale.getDefault())
        val hardware = Build.HARDWARE.lowercase(Locale.getDefault())
        return fingerprint.startsWith("generic") || fingerprint.contains("vbox") || fingerprint.contains("test-keys") ||
            model.contains("emulator") || model.contains("sdk_gphone") || model.contains("genymotion") ||
            product.contains("sdk") || product.contains("emulator") ||
            hardware.contains("goldfish") || hardware.contains("ranchu")
    }
    private fun shortDate(value: String): String = value.take(10).takeIf { it.isNotBlank() } ?: "—"
    private fun validDate(value: String): Boolean = runCatching { LocalDate.parse(value, DateTimeFormatter.ISO_DATE) }.isSuccess
    private fun money(value: Double): String = NumberFormat.getNumberInstance(Locale("vi", "VN")).format(value) + "đ"
    @Suppress("DEPRECATION")
    private fun appVersion(): String = packageManager.getPackageInfo(packageName, 0).versionName ?: "—"

    private fun vertical(): LinearLayout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    private fun horizontal(gravityValue: Int = Gravity.TOP): LinearLayout = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = gravityValue }
    private fun card(): LinearLayout = vertical().apply {
        setPadding(dp(16), dp(15), dp(16), dp(15)); background = background(surface, 16f)
        elevation = dp(1).toFloat()
    }
    private fun label(value: String, size: Float, bold: Boolean, color: Int): TextView = TextView(this).apply { text = value; textSize = size; setTextColor(color); includeFontPadding = false; if (bold) setTypeface(typeface, Typeface.BOLD); setLineSpacing(0f, 1.08f) }
    private fun autoText(view: TextView, minSp: Float, maxSp: Float, lines: Int): TextView = view.apply {
        maxLines = lines
        ellipsize = TextUtils.TruncateAt.END
        setAutoSizeTextTypeUniformWithConfiguration(minSp.toInt(), maxSp.toInt().coerceAtLeast(minSp.toInt() + 1), 1, TypedValue.COMPLEX_UNIT_SP)
    }
    private fun compactLayout(): Boolean = resources.configuration.screenWidthDp < 400 || resources.configuration.fontScale > 1.08f
    private fun sectionTitle(value: String): TextView = label(value, 18f, true, ink)
    private fun field(hintValue: String, initial: String, password: Boolean = false, number: Boolean = false): EditText = EditText(this).apply {
        hint = hintValue; setText(initial); textSize = 14f; setTextColor(ink); setHintTextColor(Color.rgb(132, 143, 174)); setPadding(dp(13), dp(10), dp(13), dp(10)); background = background(Color.WHITE, 13f, Color.rgb(222, 229, 242))
        inputType = when { password -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD; number -> InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL; else -> InputType.TYPE_CLASS_TEXT }
    }
    private fun actionButton(title: String, icon: Int = 0, filled: Boolean = false, action: () -> Unit): Button = Button(this).apply {
        text = title; textSize = 12.5f; isAllCaps = false; minHeight = dp(46); setPadding(dp(10), 0, dp(10), 0); stateListAnimator = null
        maxLines = 2; ellipsize = TextUtils.TruncateAt.END
        setAutoSizeTextTypeUniformWithConfiguration(9, 12, 1, TypedValue.COMPLEX_UNIT_SP)
        setTextColor(if (filled) Color.WHITE else primary); background = background(if (filled) primary else Color.WHITE, 12f, if (filled) primary else Color.rgb(211, 219, 239))
        if (filled) setTypeface(typeface, Typeface.BOLD)
        if (icon != 0) {
            setCompoundDrawablesWithIntrinsicBounds(icon, 0, 0, 0); compoundDrawablePadding = dp(6)
            compoundDrawableTintList = ColorStateList.valueOf(if (filled) Color.WHITE else primary)
        }
        setOnClickListener { action() }
    }
    private fun linkButton(title: String, action: () -> Unit): Button = actionButton(title, 0, false, action).apply { setBackgroundColor(Color.TRANSPARENT); minHeight = dp(38); setPadding(dp(6), 0, dp(6), 0) }
    private fun chip(title: String, color: Int): TextView = autoText(label(title, 10.5f, true, color), 8f, 10.5f, 1).apply { setPadding(dp(9), dp(5), dp(9), dp(5)); background = background(withAlpha(color, 28), 14f) }
    private fun emptyState(message: String): View = label(message, 13f, false, muted).apply { setPadding(dp(14), dp(18), dp(14), dp(18)); gravity = Gravity.CENTER; background = background(surface, 12f, Color.rgb(231, 235, 245)) }
    private fun background(color: Int, radius: Float, stroke: Int? = null): GradientDrawable = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius.toInt()).toFloat(); if (stroke != null) setStroke(dp(1), stroke) }
    private fun withAlpha(color: Int, alpha: Int) = Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))
    private fun matchWrap(top: Int = 0, bottom: Int = 0): LinearLayout.LayoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(top); bottomMargin = dp(bottom) }
    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    private fun confirm(message: String, action: () -> Unit) {
        AlertDialog.Builder(this).setTitle("Xác nhận").setMessage(message).setNegativeButton("Hủy", null).setPositiveButton("Đồng ý") { _, _ -> action() }.show()
    }

    private fun <T> runTask(block: () -> T, success: (T) -> Unit) {
        executor.execute {
            try { val result = block(); runOnUiThread { success(result) } }
            catch (error: Exception) { runOnUiThread { toast(error.message ?: "Không thể kết nối máy chủ.") } }
        }
    }

    private fun simpleWatcher(after: () -> Unit) = object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, afterCount: Int) = Unit
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
        override fun afterTextChanged(s: Editable?) = after()
    }

    private fun simpleSelection(selected: (Int) -> Unit) = object : AdapterView.OnItemSelectedListener {
        override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) = selected(position)
    }

    override fun onDestroy() { executor.shutdownNow(); super.onDestroy() }
}
