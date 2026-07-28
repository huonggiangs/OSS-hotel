// Seed mặc định cho từng nhóm "property_settings" — đối chiếu đúng giá trị
// mẫu trong apps/web/src/lib/mock-data.ts (giữ giao diện không đổi khi chuyển
// từ mock sang API thật). Dùng bởi settingsBootstrap.ts — chạy lúc API khởi
// động, KHÔNG nằm trong file migration (xem lý do ở đầu
// database/migrations/003_property_settings.sql).
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  "basic": {
    "floorInputs": [
      "Tầng 1",
      "Tầng 2",
      "Tầng 3",
      "Tầng 4",
      "Tầng 5",
      "Tầng 6",
      "Tầng 7",
      "Tầng 8",
      "Tầng 9"
    ],
    "info": {
      "intro": "",
      "website": "",
      "ctvCode": ""
    },
    "owner": {
      "fullName": "",
      "idNumber": "",
      "phone": "",
      "email": ""
    },
    "payment": {
      "bankName": "",
      "accountNumber": "",
      "accountHolder": ""
    }
  },
  "amenities": {
    "groups": [
      {
        "title": "Cơ bản",
        "items": [
          "Wifi",
          "Disco (mùa hè)",
          "Đầu báo cháy",
          "Vườn",
          "Lễ tân 24 giờ",
          "Báo khói",
          "Sân thượng",
          "Fax/ Photocopy",
          "Bãi đỗ xe riêng của khách sạn",
          "Nhận/trả phòng nhanh",
          "TV màn hình phẳng",
          "Nhà để xe (gara)",
          "Toàn bộ không hút thuốc",
          "Phòng tân hôn",
          "Chỉ dành cho người lớn",
          "Phòng không hút thuốc",
          "Khuôn viên",
          "Ven biển",
          "Thang máy",
          "Thang máy",
          "Khách sạn có Spa",
          "Điều hòa",
          "Phòng chống dị ứng",
          "Khách sạn gần khu trượt tuyết",
          "TV",
          "Sát biển",
          "Khách sạn suối khoáng nóng",
          "Disco (mùa đông)",
          "Lối vào có camera giám sát"
        ]
      },
      {
        "title": "Tổng quan",
        "items": [
          "Ra vào tự do",
          "Lối đi vào riêng",
          "Không chung chủ",
          "Cửa cổng khóa vân tay/ thẻ từ",
          "Ban công",
          "Gắn biển",
          "Cắm trại"
        ]
      },
      {
        "title": "An toàn - An ninh",
        "items": [
          "Camera an ninh",
          "Bảo vệ chung",
          "Két sắt",
          "Khóa điện tử",
          "Bình chữa cháy",
          "Hệ thống báo cháy"
        ]
      },
      {
        "title": "Phòng tắm",
        "items": [
          "Bình nóng lạnh",
          "Đèn sưởi",
          "Khăn tắm",
          "Xà phòng",
          "Dầu gội",
          "Kem đánh răng",
          "Bồn sục",
          "Phòng tắm gương",
          "Chậu rửa mặt"
        ]
      },
      {
        "title": "Mua sắm, giải trí",
        "items": [
          "Chợ",
          "Siêu thị",
          "Tạp hóa"
        ]
      },
      {
        "title": "Quy định chung",
        "items": [
          "Cấm nhậu quá 23h",
          "Cấm làm ồn",
          "Cấm vật nuôi",
          "Về trước 22h đêm",
          "Không dẫn bạn về qua đêm",
          "Được nấu ăn"
        ]
      },
      {
        "title": "Cao cấp",
        "items": [
          "Smart Tivi",
          "Smarthome",
          "Smart hotel",
          "GYM",
          "Bể bơi"
        ]
      }
    ],
    "activitiesCols": [
      [
        "Xe đạp nước phiêu lưu",
        "Hộp đêm",
        "Cơ sở vật chất thể thao tại chỗ",
        "Cưỡi ngựa",
        "Hồ bơi ngoài trời (quanh năm)",
        "Hồ bơi ngoài trời (theo mùa)",
        "Hồ bơi trong nhà (quanh năm)",
        "Hồ bơi trong nhà (theo mùa)",
        "Sân golf nước khoáng nóng (trong vòng 3km)",
        "Lướt ván buồm",
        "Phi tiêu",
        "Casino mini",
        "Golf",
        "Karaoke",
        "Ca-nô",
        "Sân tennis"
      ],
      [
        "Câu cá",
        "Bóng bàn",
        "Phòng trưng bày",
        "Lặn",
        "Lặn ống thở",
        "Phòng trò chơi",
        "Bowling",
        "Trượt tuyết",
        "Bi-a",
        "Khu vui chơi trẻ em",
        "Đi bộ đường dài",
        "Hồ bơi ngoài trời",
        "Massage",
        "Xông hơi",
        "Bồn tắm nước nóng"
      ],
      [
        "Trung tâm Spa & chăm sóc sức khỏe",
        "Hồ bơi trong nhà",
        "Nhân viên giải trí, phòng xông hơi, phi tiêu...",
        "Bóng đá mini",
        "Khúc côn cầu bàn",
        "Trò chơi điện tử",
        "Bóng rổ",
        "Muối",
        "Nhà hát",
        "Tuyết",
        "Đài phun nước",
        "Cáp treo",
        "Kayak, xe kart, mô tô",
        "Vé trượt tuyết / Ghế treo",
        "Ghế nằm bãi biển & hồ bơi"
      ]
    ],
    "amenityServicesCols": [
      [
        "Dịch vụ hỗ trợ khách (Concierge)",
        "Đội ngũ hoạt náo",
        "Nhận/trả phòng riêng tư",
        "Cho thuê thiết bị trượt tuyết tại chỗ",
        "Bán vé trượt tuyết",
        "Lối vào trượt tuyết tận cửa",
        "Thực đơn ăn kiêng đặc biệt (theo yêu cầu)",
        "Máy ép quần",
        "Máy bán nước tự động",
        "Máy bán đồ ăn vặt tự động",
        "Suất ăn trưa mang đi",
        "Phòng họp/tiệc",
        "Phòng trăng mật",
        "Tiện nghi phòng VIP",
        "Dịch vụ trông trẻ",
        "Cửa hàng quà lưu niệm",
        "Đánh giày",
        "Cửa hàng làm đẹp",
        "Dịch vụ đặt vé",
        "Cho thuê xe đạp",
        "Giặt khô",
        "Đổi ngoại tệ",
        "Quầy tư vấn tour",
        "Thuê xe ô tô",
        "Ăn sáng tại phòng",
        "Dịch vụ ủi đồ",
        "Giặt ủi",
        "Xe đưa đón sân bay",
        "Xe đưa đón sân bay (phụ thu)",
        "Phục vụ phòng",
        "Máy ATM tại chỗ",
        "Phòng chống dị ứng",
        "Ăn sáng buffet",
        "Khu bãi biển riêng",
        "Nhà hàng gọi món",
        "Nhà hàng buffet",
        "Quầy đồ ăn nhẹ",
        "Sân thượng tắm nắng",
        "Tiện nghi cho khách khuyết tật",
        "Phòng cách âm",
        "Sưởi ấm",
        "Thân thiện với LGBT",
        "Kho chứa đồ trượt tuyết",
        "Dịch vụ đỗ xe hộ",
        "Khu vực hút thuốc riêng",
        "Cửa hàng trong khách sạn",
        "Phòng gia đình",
        "Két an toàn",
        "Báo, tạp chí",
        "Nhà hàng",
        "Giữ hành lý",
        "Quầy bar",
        "Lễ tân 24 giờ",
        "Trường dạy trượt tuyết",
        "Phòng tắm nắng nhân tạo",
        "Bóng quần (Squash)",
        "Khu vực BBQ",
        "Dù che bãi biển & hồ bơi",
        "Ghế nằm hồ bơi",
        "Bờ biển",
        "Ghế nằm bãi biển",
        "Cầu trượt nước"
      ],
      [
        "Khăn tắm biển",
        "Nhân viên cứu hộ",
        "Hồ bơi nước khoáng nóng",
        "Chứng nhận Cờ Xanh",
        "Ghế nằm hồ bơi",
        "Bờ biển",
        "Ghế nằm bãi biển",
        "Cầu trượt nước",
        "Khăn tắm biển",
        "Nhân viên cứu hộ",
        "Hồ bơi nước khoáng nóng",
        "Chứng nhận Cờ Xanh",
        "Công viên nước",
        "Phòng thay đồ",
        "Xe đưa đón",
        "Bóng rổ",
        "Bóng chuyền bãi biển",
        "Mô tô nước",
        "Rạp chiếu phim",
        "Bóng đá (có phí)",
        "Bữa tối muộn",
        "Trà chiều",
        "Hồ bơi trẻ em",
        "Phù hợp cho trẻ em",
        "Câu lạc bộ mini",
        "Cho phép thú cưng",
        "Quán cà phê Internet",
        "Cảng biển",
        "Bác sĩ",
        "Nhiếp ảnh gia",
        "Bãi đỗ xe",
        "Phòng xem TV",
        "Đèn chiếu sáng sân tennis",
        "Bãi cát biển",
        "Cửa hàng tạp hóa",
        "Máy chơi game Playstation",
        "Điện thoại gọi trực tiếp",
        "Dịch vụ báo thức",
        "Quầy bar mini",
        "Đồ dùng phòng tắm miễn phí",
        "Máy sấy tóc",
        "Dịch vụ đưa đón",
        "Bếp",
        "Gương trang điểm",
        "Sân tennis chiếu sáng ban đêm",
        "Y tá",
        "Chợ",
        "Máy pinball",
        "Chăm sóc da & cơ thể",
        "Bóng rổ ban đêm",
        "Tiệm làm tóc",
        "Giường tắm nắng",
        "Ghế cho bé",
        "Thể dục nhịp điệu",
        "Bắn cung",
        "Bóng nước",
        "Bóng rổ",
        "Giường cho bé",
        "Phục vụ phòng",
        "Dịch vụ nhà nghỉ",
        "Bữa tối",
        "Cà phê sân thượng"
      ],
      [
        "Đồ ăn nhẹ",
        "Quầy bar sảnh",
        "Ăn sáng",
        "Dịch vụ đưa đón",
        "Điện thoại",
        "Nhà hàng gọi món",
        "Bãi đỗ xe riêng",
        "Phòng tập gym",
        "Quầy cocktail",
        "Cửa hàng quà tặng",
        "Nhà hàng buffet",
        "Suất ăn kiêng đặc biệt",
        "Bãi đỗ xe riêng miễn phí",
        "Khu sinh hoạt chung/xem TV",
        "Dọn phòng hàng ngày",
        "Bãi đỗ xe công cộng miễn phí",
        "Tiệm cắt tóc/làm đẹp",
        "Hồ bơi",
        "Căng-tin",
        "Cửa hàng tiện lợi tại chỗ",
        "Bóng bàn",
        "Bồn tắm",
        "Phòng hội nghị",
        "Chấp nhận thẻ tín dụng",
        "Cửa hàng tại chỗ",
        "Giữ hành lý",
        "Hồ bơi ngoài trời nam",
        "Hồ bơi nữ & trẻ em",
        "Hồ bơi nam & trẻ em",
        "Bãi biển nữ",
        "Bãi biển nam",
        "Hồ bơi ngoài trời nữ",
        "Hồ bơi nước ấm nữ",
        "Công viên nước ngoài trời nữ",
        "Công viên nước nước ấm nữ",
        "Hồ công viên nước ấm nam",
        "Công viên nước nước ấm nam",
        "Công viên nước ngoài trời nam",
        "Phòng tắm gia đình",
        "Đồ uống không giới hạn cả ngày",
        "Súp đêm",
        "Ăn sáng sớm",
        "Hồ bơi ngoài trời chung",
        "Công viên nước trong nhà chung",
        "Hồ bơi trong nhà chung",
        "Trung tâm Spa nam",
        "Trung tâm Spa nữ",
        "Tắm hơi kiểu Thổ Nhĩ Kỳ (giờ riêng cho nữ)",
        "Tắm bùn",
        "Bồn sục Jacuzzi",
        "Nhà hát ngoài trời",
        "Hồ bơi trong nhà nữ",
        "Hồ bơi trong nhà nam",
        "Lò sưởi",
        "Đường trượt tuyết",
        "Quầy vitamin",
        "Thư viện",
        "Máy sấy quần áo",
        "Tùy chọn lưu trú",
        "Tùy chọn ẩm thực (F&B)",
        "Đồ ăn Halal"
      ]
    ],
    "selected": []
  },
  "images": {
    "galleryCount": 5,
    "roomTypes": [
      {
        "name": "Single",
        "photoCount": 5
      },
      {
        "name": "Double",
        "photoCount": 5
      }
    ]
  },
  "email": {
    "fields": {
      "email": "",
      "password": "",
      "smtpHost": "",
      "smtpPort": "",
      "encryption": ""
    },
    "autoEmails": [
      "Khách đặt phòng lưu trú",
      "Nhắc khách sắp đến ngày đến cơ sở",
      "Nhắc khách thanh toán hóa đơn",
      "Cảm ơn khách khi check out khỏi cơ sở"
    ],
    "autoEmailsEnabled": [
      "Khách đặt phòng lưu trú",
      "Nhắc khách sắp đến ngày đến cơ sở",
      "Nhắc khách thanh toán hóa đơn",
      "Cảm ơn khách khi check out khỏi cơ sở"
    ]
  },
  "security": {
    "items": [
      {
        "key": "2fa",
        "label": "Xác thực 2 lớp (2FA)",
        "desc": "Yêu cầu mã OTP khi đăng nhập từ thiết bị lạ",
        "on": true
      },
      {
        "key": "autologout",
        "label": "Tự động đăng xuất sau 30 phút",
        "desc": "Đăng xuất khi không thao tác",
        "on": true
      },
      {
        "key": "iprestrict",
        "label": "Giới hạn IP truy cập",
        "desc": "Chỉ cho phép đăng nhập từ IP nội bộ khách sạn",
        "on": false
      }
    ]
  },
  "currency": {
    "items": [
      {
        "code": "VND",
        "name": "Việt Nam Đồng",
        "rate": "1 (mặc định)",
        "isDefault": true
      },
      {
        "code": "USD",
        "name": "Đô la Mỹ",
        "rate": "1 USD = 25.400 VND",
        "isDefault": false
      },
      {
        "code": "EUR",
        "name": "Euro",
        "rate": "1 EUR = 27.600 VND",
        "isDefault": false
      }
    ]
  },
  "tax": {
    "items": [
      {
        "name": "Thuế GTGT (VAT)",
        "rate": "8%",
        "applyTo": "Toàn bộ hoá đơn"
      },
      {
        "name": "Phí dịch vụ",
        "rate": "5%",
        "applyTo": "Toàn bộ hoá đơn"
      },
      {
        "name": "Phí môi trường",
        "rate": "20.000đ/phòng/đêm",
        "applyTo": "Tiền phòng"
      }
    ]
  },
  "time": {
    "holidays": [
      "Giỗ tổ",
      "Quốc khánh",
      "Dương lịch"
    ],
    "prepaidServices": [
      "Điện",
      "Nước",
      "Internet",
      "Vệ Sinh",
      "Thang máy"
    ],
    "checkinTime": "14:00",
    "checkoutTime": "12:00"
  },
  "printer": {
    "defaultPrinter": "Epson TM-T82 (Quầy lễ tân)",
    "paperSize": "K80 (80mm)",
    "templates": [
      {
        "doc": "Hợp đồng lưu trú",
        "template": "Mẫu hợp đồng A4 song ngữ",
        "size": "A4",
        "linked": true
      },
      {
        "doc": "Hoá đơn thanh toán",
        "template": "Mẫu hoá đơn K80 chuẩn",
        "size": "K80 (80mm)",
        "linked": true
      },
      {
        "doc": "Hoá đơn GTGT (VAT)",
        "template": "Mẫu hoá đơn điện tử theo Nghị định 123",
        "size": "A5",
        "linked": true
      },
      {
        "doc": "Phiếu đăng ký lưu trú (tạm trú)",
        "template": "Mẫu A5 theo quy định công an (NA17)",
        "size": "A5",
        "linked": true
      },
      {
        "doc": "Phiếu khai báo tạm trú người nước ngoài",
        "template": "Mẫu NA17 song ngữ Anh–Việt",
        "size": "A5",
        "linked": true
      },
      {
        "doc": "Phiếu xác nhận đặt phòng (Booking Confirmation)",
        "template": "Mẫu A4 có logo cơ sở",
        "size": "A4",
        "linked": true
      },
      {
        "doc": "Biên nhận tạm ứng (Deposit Receipt)",
        "template": "Mẫu biên nhận K80",
        "size": "K80 (80mm)",
        "linked": true
      },
      {
        "doc": "Phiếu ghi dịch vụ phát sinh (Extra Charge Slip)",
        "template": "Mẫu K80 kèm chữ ký khách",
        "size": "K80 (80mm)",
        "linked": true
      },
      {
        "doc": "Phiếu bàn giao ca (Shift Handover)",
        "template": "Chưa chọn mẫu",
        "size": "—",
        "linked": false
      },
      {
        "doc": "Thẻ chìa khoá / thẻ phòng (Key Card Envelope)",
        "template": "Mẫu bao thẻ phòng in logo",
        "size": "Tuỳ chỉnh 8.5×5.4cm",
        "linked": false
      }
    ]
  },
  "channel": {
    "items": [
      {
        "name": "Booking.com",
        "initial": "B",
        "color": "#003580",
        "status": "Đã kết nối",
        "statusColor": "#00C853",
        "stat": "37 đặt phòng tháng này · đồng bộ 2 phút trước"
      },
      {
        "name": "Agoda",
        "initial": "A",
        "color": "#5A1F8A",
        "status": "Đã kết nối",
        "statusColor": "#00C853",
        "stat": "22 đặt phòng tháng này · đồng bộ 5 phút trước"
      },
      {
        "name": "Airbnb",
        "initial": "Ab",
        "color": "#FF5A5F",
        "status": "Đã kết nối",
        "statusColor": "#00C853",
        "stat": "15 đặt phòng tháng này · đồng bộ 9 phút trước"
      },
      {
        "name": "Traveloka",
        "initial": "T",
        "color": "#1B9AAA",
        "status": "Chưa kết nối",
        "statusColor": "#CC2F42",
        "stat": "Cần nhập API key để bật đồng bộ"
      }
    ]
  },
  "sync": {
    "otaChannels": [
      "Booking.com",
      "Agoda",
      "Airbnb",
      "Traveloka",
      "Expedia"
    ],
    "selectedChannels": [
      "Booking.com",
      "Agoda",
      "Airbnb"
    ],
    "syncGoogleHotel": true,
    "syncWebsite": true,
    "autoSync": true
  },
  "db": {
    "info": [
      {
        "label": "Sao lưu gần nhất",
        "value": "25/07/2026 03:00"
      },
      {
        "label": "Tần suất sao lưu",
        "value": "Hàng ngày lúc 03:00"
      },
      {
        "label": "Dung lượng đã dùng",
        "value": "4.2 GB / 20 GB"
      },
      {
        "label": "Vị trí lưu trữ",
        "value": "Máy chủ đám mây ANIO Cloud"
      }
    ]
  },
  "social": {
    "links": [
      {
        "name": "Facebook",
        "handle": "facebook.com/anio.riverside",
        "on": true,
        "autoOn": true
      },
      {
        "name": "Zalo OA",
        "handle": "zalo.me/anioriverside",
        "on": true,
        "autoOn": true
      },
      {
        "name": "Instagram",
        "handle": "instagram.com/anio.riverside",
        "on": false,
        "autoOn": false
      },
      {
        "name": "Website",
        "handle": "anioriverside.vn",
        "on": true,
        "autoOn": true
      }
    ]
  },
  "modules": {
    "items": [
      {
        "key": "power",
        "name": "Liên kết điện",
        "icon": "🔌",
        "bg": "#EAF2FF",
        "price": "3.000đ/phòng/tháng",
        "on": true
      },
      {
        "key": "notify",
        "name": "Thông báo",
        "icon": "🔔",
        "bg": "#FFF7E0",
        "free": true,
        "on": true
      },
      {
        "key": "cots",
        "name": "Dịch vụ order trong phòng",
        "icon": "🧸",
        "bg": "#FDEFE9",
        "free": true,
        "on": true
      },
      {
        "key": "housekeeping",
        "name": "Dọn phòng (Housekeeping)",
        "icon": "🧹",
        "bg": "#FDF3D8",
        "price": "3.000đ/phòng/tháng",
        "on": true
      },
      {
        "key": "rfid",
        "name": "Liên kết ScanQr",
        "icon": "📶",
        "bg": "#E6F4FF",
        "price": "2.000đ/phòng/tháng",
        "on": true
      },
      {
        "key": "camera",
        "name": "Camera",
        "icon": "📷",
        "bg": "#EEF1F4",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "passport",
        "name": "Hộ chiếu, CCCD",
        "icon": "🛂",
        "bg": "#EAF0FF",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "gatelock",
        "name": "Khóa cổng",
        "icon": "🔒",
        "bg": "#E7F7EE",
        "price": "200.000đ",
        "on": false
      },
      {
        "key": "cms",
        "name": "Quản trị nội dung — Liên kết OTA",
        "icon": "⚙️",
        "bg": "#EDEFF2",
        "price": "Liên hệ",
        "on": true
      },
      {
        "key": "marketing2",
        "name": "Marketing",
        "icon": "📣",
        "bg": "#FFF1E6",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "account",
        "name": "Tài khoản",
        "icon": "✅",
        "bg": "#E9F0FF",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "doorlock",
        "name": "Liên kết khoá từ",
        "icon": "🔢",
        "bg": "#E6F6FF",
        "price": "3.000đ/phòng/tháng",
        "on": true
      },
      {
        "key": "task",
        "name": "Công việc",
        "icon": "📋",
        "bg": "#E9F0FF",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "hrm",
        "name": "Nhân sự (HRM)",
        "icon": "🧑‍🤝‍🧑",
        "bg": "#F1ECFB",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "webbooking",
        "name": "Đặt phòng qua Web",
        "icon": "✈️",
        "bg": "#E9F0FF",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "otasync",
        "name": "Đồng bộ OTA",
        "icon": "☁️",
        "bg": "#E6F4FF",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "extend",
        "name": "Gia hạn lưu trú",
        "icon": "↗️",
        "bg": "#FFF4D6",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "breakeven",
        "name": "Điểm hòa vốn",
        "icon": "👛",
        "bg": "#F3E9E0",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "combo",
        "name": "Gói combo",
        "icon": "🧳",
        "bg": "#FDEDE6",
        "price": "200.000đ",
        "on": true
      },
      {
        "key": "aicamera",
        "name": "Thống kê khách hàng AI Camera",
        "icon": "📊",
        "bg": "#E6F4FF",
        "price": "200.000đ",
        "on": false
      },
      {
        "key": "screenlink",
        "name": "Liên kết màn hình phụ",
        "icon": "🖥️",
        "bg": "#EAF2FF",
        "price": "3.000đ/phòng/tháng",
        "on": false
      },
      {
        "key": "einvoice",
        "name": "Xuất hoá đơn điện",
        "icon": "🧾",
        "bg": "#FFF7E0",
        "price": "500.000–900.000đ/năm",
        "on": false
      },
      {
        "key": "voiceassistant",
        "name": "Trợ lý ảo AI cho khách (Voice/Chatbot)",
        "icon": "🗣️",
        "bg": "#F1ECFB",
        "price": "250.000đ/phòng/tháng",
        "on": false
      },
      {
        "key": "smartenergy",
        "name": "Tiết kiệm năng lượng AI",
        "icon": "🌿",
        "bg": "#E7F7EE",
        "price": "5.000đ/phòng/tháng",
        "on": false
      },
      {
        "key": "facecheckin",
        "name": "Nhận diện khuôn mặt check-in",
        "icon": "🪪",
        "bg": "#EAF0FF",
        "price": "300.000đ/tháng",
        "on": false
      },
      {
        "key": "dynamicpricing",
        "name": "Định giá phòng linh hoạt (Dynamic Pricing AI)",
        "icon": "📈",
        "bg": "#FFF4D6",
        "price": "400.000đ/tháng",
        "on": false
      },
      {
        "key": "contactlessagent",
        "name": "Trợ lý nghỉ dưỡng không tiếp xúc (QR trong phòng)",
        "icon": "📲",
        "bg": "#E6F4FF",
        "price": "2.000đ/phòng/tháng",
        "on": false
      }
    ]
  },
  "utilities": {
    "links": [
      {
        "key": "maps",
        "name": "Google Maps",
        "desc": "Hiển thị vị trí cơ sở trên Google Maps để khách dễ dàng tìm đường",
        "linked": true
      },
      {
        "key": "hotel",
        "name": "Google Hotel (Google Hotel Ads)",
        "desc": "Đồng bộ giá phòng, tình trạng còn phòng để hiển thị trên Google Hotel Search",
        "linked": false
      }
    ],
    "syncAvail": true,
    "syncPromo": false
  },
  "assets": {
    "items": [
      {
        "name": "Điều hoà Daikin",
        "code": "DH",
        "room": "204",
        "value": "10.000.000đ",
        "qty": 35,
        "unit": "Cái",
        "depMonths": 12,
        "depValue": "12.000.000đ",
        "status": "Đang dùng",
        "fg": "#00C853",
        "stt": 1
      },
      {
        "name": "Khoá cửa thông minh",
        "code": "KC",
        "room": "118",
        "value": "1.500.000đ",
        "qty": 35,
        "unit": "Cái",
        "depMonths": 12,
        "depValue": "2.000.000đ",
        "status": "Đang dùng",
        "fg": "#00C853",
        "stt": 2
      },
      {
        "name": "TV Samsung 55\"",
        "code": "TV",
        "room": "310",
        "value": "8.000.000đ",
        "qty": 35,
        "unit": "Cái",
        "depMonths": 12,
        "depValue": "9.500.000đ",
        "status": "Cần kiểm tra",
        "fg": "#946200",
        "stt": 3
      },
      {
        "name": "Bình nóng lạnh",
        "code": "BNL",
        "room": "402",
        "value": "1.000.000đ",
        "qty": 35,
        "unit": "Cái",
        "depMonths": 12,
        "depValue": "12.000.000đ",
        "status": "Hỏng",
        "fg": "#CC2F42",
        "stt": 4
      },
      {
        "name": "Camera hành lang T3",
        "code": "CAM",
        "room": "Khu vực chung",
        "value": "1.000.000đ",
        "qty": 35,
        "unit": "Cái",
        "depMonths": 12,
        "depValue": "12.000.000đ",
        "status": "Đang dùng",
        "fg": "#00C853",
        "stt": 5
      },
      {
        "name": "Giường đôi",
        "code": "GD",
        "room": "Nhiều phòng",
        "value": "1.000.000đ",
        "qty": 35,
        "unit": "Bộ",
        "depMonths": 12,
        "depValue": "12.000.000đ",
        "status": "Đang dùng",
        "fg": "#00C853",
        "stt": 6
      },
      {
        "name": "Tủ lạnh mini",
        "code": "TL",
        "room": "Nhiều phòng",
        "value": "1.000.000đ",
        "qty": 35,
        "unit": "Cái",
        "depMonths": 12,
        "depValue": "12.000.000đ",
        "status": "Hỏng",
        "fg": "#CC2F42",
        "stt": 7
      },
      {
        "name": "Quạt treo tường",
        "code": "QT",
        "room": "Nhiều phòng",
        "value": "1.000.000đ",
        "qty": 35,
        "unit": "Cái",
        "depMonths": 12,
        "depValue": "12.000.000đ",
        "status": "Đang dùng",
        "fg": "#00C853",
        "stt": 8
      },
      {
        "name": "Tủ quần áo",
        "code": "QA",
        "room": "Nhiều phòng",
        "value": "1.000.000đ",
        "qty": 35,
        "unit": "Cái",
        "depMonths": 12,
        "depValue": "12.000.000đ",
        "status": "Đang dùng",
        "fg": "#00C853",
        "stt": 9
      }
    ]
  },
  "services": {
    "own": [
      {
        "id": 0,
        "name": "Tour đi bộ",
        "category": "Tour trải nghiệm",
        "unit": "Lượt",
        "schedule": "Thứ hai, 12/08/2022 · 5:30",
        "vehicle": "Xe đạp",
        "price": "300.000đ",
        "location": "Đón tại cơ sở",
        "linked": true
      },
      {
        "id": 1,
        "name": "Tour lặn biển",
        "category": "Tour trải nghiệm",
        "unit": "Lượt",
        "schedule": "Thứ ba, 13/08/2022 · 5:30",
        "vehicle": "Ô tô",
        "price": "300.000đ",
        "location": "Đón tại cơ sở",
        "linked": true
      },
      {
        "id": 2,
        "name": "Tour leo núi",
        "category": "Tour trải nghiệm",
        "unit": "Lượt",
        "schedule": "Thứ tư, 14/08/2022 · 5:30",
        "vehicle": "Tàu biển",
        "price": "300.000đ",
        "location": "Đón tại cơ sở",
        "linked": true
      },
      {
        "id": 3,
        "name": "Bus dạo phố",
        "category": "Tour trải nghiệm",
        "unit": "Lượt",
        "schedule": "Thứ năm, 15/08/2022 · 5:30",
        "vehicle": "Xe bus",
        "price": "300.000đ",
        "location": "Tại quầy lễ tân",
        "linked": false
      },
      {
        "id": 4,
        "name": "Chạy bộ cùng HLV",
        "category": "Tour trải nghiệm",
        "unit": "Lượt",
        "schedule": "Thứ sáu, 16/08/2022 · 5:30",
        "vehicle": "Không cần",
        "price": "300.000đ",
        "location": "Tại cơ sở",
        "linked": true
      },
      {
        "id": 5,
        "name": "Khám phá hang động",
        "category": "Tour trải nghiệm",
        "unit": "Lượt",
        "schedule": "Thứ bảy, 17/08/2022 · 5:30",
        "vehicle": "Xe địa hình",
        "price": "300.000đ",
        "location": "Đón tại cơ sở",
        "linked": true
      },
      {
        "id": 6,
        "name": "Mạng Internet",
        "category": "Vệ sinh",
        "unit": "Tháng",
        "schedule": "Định kỳ hàng tháng",
        "vehicle": "—",
        "price": "100.000đ",
        "location": "Tại phòng",
        "linked": true
      },
      {
        "id": 7,
        "name": "Vệ sinh phòng",
        "category": "Vệ sinh",
        "unit": "Tháng",
        "schedule": "Định kỳ hàng tháng",
        "vehicle": "—",
        "price": "150.000đ",
        "location": "Tại phòng",
        "linked": false
      },
      {
        "id": 8,
        "name": "Gửi xe",
        "category": "Gửi xe",
        "unit": "Tháng",
        "schedule": "Định kỳ hàng tháng",
        "vehicle": "—",
        "price": "100.000đ",
        "location": "Tại cơ sở",
        "linked": true
      },
      {
        "id": 9,
        "name": "Nước",
        "category": "Nước",
        "unit": "m3",
        "schedule": "Theo chỉ số hàng tháng",
        "vehicle": "—",
        "price": "15.000đ",
        "location": "Tại phòng",
        "linked": true
      },
      {
        "id": 10,
        "name": "Điện",
        "category": "Điện",
        "unit": "Số",
        "schedule": "Theo chỉ số hàng tháng",
        "vehicle": "—",
        "price": "3.500đ",
        "location": "Tại phòng",
        "linked": true
      }
    ],
    "partners": [
      {
        "name": "Spa Hương Sen",
        "category": "Spa & Massage",
        "distance": "150m",
        "commission": "10%",
        "linked": true
      },
      {
        "name": "Nhà hàng Biển Đông",
        "category": "Ẩm thực",
        "distance": "300m",
        "commission": "8%",
        "linked": true
      },
      {
        "name": "Tour Đảo Ngọc",
        "category": "Tour & Trải nghiệm",
        "distance": "1.2km",
        "commission": "15%",
        "linked": false
      },
      {
        "name": "Cho thuê xe máy Minh Phát",
        "category": "Di chuyển",
        "distance": "80m",
        "commission": "12%",
        "linked": true
      },
      {
        "name": "Phòng gym FitZone",
        "category": "Thể thao",
        "distance": "400m",
        "commission": "5%",
        "linked": false
      }
    ]
  },
  "marketing": {
    "campaigns": [
      {
        "name": "Ưu đãi hè 2026",
        "channel": "Email",
        "start": "01/06/2026",
        "end": "31/08/2026",
        "sent": 1203,
        "opened": "38%",
        "status": "Đang chạy",
        "bg": "#E6F9EE",
        "fg": "#00C853"
      },
      {
        "name": "Giảm 20% đặt sớm",
        "channel": "SMS",
        "start": "01/03/2026",
        "end": "15/04/2026",
        "sent": 850,
        "opened": "61%",
        "status": "Đã kết thúc",
        "bg": "#F4F5F6",
        "fg": "#777E90"
      },
      {
        "name": "Khách hàng thân thiết",
        "channel": "Email",
        "start": "01/01/2026",
        "end": "31/12/2026",
        "sent": 430,
        "opened": "52%",
        "status": "Đang chạy",
        "bg": "#E6F9EE",
        "fg": "#00C853"
      }
    ]
  },
  "daily_entries": {
    "items": [
      {
        "id": "TC001",
        "type": "Thu",
        "typeColor": "#00C853",
        "desc": "Thu tiền phòng 101, 203",
        "amount": "4.500.000đ",
        "by": "Lê Thảo",
        "status": "approved"
      },
      {
        "id": "TC002",
        "type": "Chi",
        "typeColor": "#CC2F42",
        "desc": "Mua văn phòng phẩm",
        "amount": "320.000đ",
        "by": "Nguyễn Văn Bình",
        "status": "pending"
      },
      {
        "id": "TC003",
        "type": "Chi",
        "typeColor": "#CC2F42",
        "desc": "Sửa vòi nước phòng 305",
        "amount": "650.000đ",
        "by": "Trần Thị Mai",
        "status": "pending"
      },
      {
        "id": "TC004",
        "type": "Thu",
        "typeColor": "#00C853",
        "desc": "Thu dịch vụ giặt ủi",
        "amount": "180.000đ",
        "by": "Lê Thảo",
        "status": "approved"
      }
    ],
    "incomeTotal": "18.400.000đ",
    "expenseTotal": "2.180.000đ"
  },
  "payment": {
    "channels": [
      "VNPay",
      "MoMo",
      "ZaloPay",
      "VietQR / Napas 247",
      "Thẻ nội địa (ATM)",
      "Visa / Mastercard",
      "Apple Pay",
      "Google Pay",
      "PayPal",
      "Alipay",
      "UnionPay"
    ],
    "selectedChannels": [
      "VNPay",
      "MoMo",
      "ZaloPay",
      "VietQR / Napas 247",
      "Thẻ nội địa (ATM)"
    ],
    "howToPay": [
      "Tiền mặt",
      "Chuyển khoản ngân hàng"
    ],
    "selectedHowToPay": [
      "Tiền mặt",
      "Chuyển khoản ngân hàng"
    ]
  },
  "roles": {
    "scopes": [
      {
        "name": "OWNER",
        "label": "Chủ sở hữu",
        "scope": "Toàn quyền mọi module"
      },
      {
        "name": "MANAGER",
        "label": "Quản lý",
        "scope": "Toàn quyền mọi module (trừ xoá cơ sở)"
      },
      {
        "name": "RECEPTIONIST",
        "label": "Lễ tân",
        "scope": "Hợp đồng, Trạng thái phòng, Thanh toán (không xoá)"
      },
      {
        "name": "HOUSEKEEPING",
        "label": "Buồng phòng",
        "scope": "Trạng thái phòng (chỉ cập nhật dọn phòng/bảo trì)"
      }
    ],
    "permissionGroups": [
      {
        "group": "Đặt phòng",
        "perms": [
          "Xem",
          "Tạo mới",
          "Sửa",
          "Hủy"
        ]
      },
      {
        "group": "Phòng & giá",
        "perms": [
          "Xem",
          "Sửa giá",
          "Thêm/xóa phòng"
        ]
      },
      {
        "group": "Thanh toán",
        "perms": [
          "Xem hóa đơn",
          "Thu tiền",
          "Hoàn tiền",
          "Chạy kế toán đêm"
        ]
      },
      {
        "group": "Người dùng",
        "perms": [
          "Xem",
          "Thêm/xóa tài khoản",
          "Phân quyền"
        ]
      },
      {
        "group": "Báo cáo",
        "perms": [
          "Xem báo cáo doanh thu"
        ]
      }
    ]
  }
};
