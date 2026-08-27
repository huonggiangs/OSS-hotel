"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";

export type AppLanguage = "vi" | "en" | "ko" | "zh" | "ja";
type LanguageMode = "DEFAULT" | "BROWSER" | "IP";

interface FacilityLanguageSettings {
  language?: unknown;
  languageMode?: unknown;
}

interface LocaleContextValue {
  language: AppLanguage;
  languageName: string;
  t: (source: string) => string;
}

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  vi: "Tiếng Việt",
  en: "English",
  ko: "한국어",
  zh: "中文",
  ja: "日本語",
};

// Các nhãn dùng chung của shell/navigation được dịch đầy đủ. Các màn hình
// nghiệp vụ mới chỉ cần gọi t("...") để dùng chung catalog này thay vì tự
// gắn chuỗi theo từng trang.
const MESSAGES: Record<AppLanguage, Record<string, string>> = {
  vi: {},
  en: {
    "Tổng quan": "Dashboard", "Đặt phòng / Hợp đồng": "Bookings / Contracts", "Trạng thái phòng": "Room status", "Chi phí": "Expenses", "Khách hàng": "Guests", "Dịch vụ": "Services", "Tiện ích": "Amenities", "Module nâng cao": "Advanced modules", "Cài đặt": "Settings", "Chi nhánh": "Property", "Danh sách cơ sở": "Property list", "Cơ bản": "General", "Hình ảnh": "Images", "Email": "Email", "Bảo vệ": "Security", "Phòng và giá": "Rooms & rates", "Thanh toán": "Payments", "Kế toán đêm": "Night audit", "Tiền tệ": "Currency", "Thuế": "Tax", "Thời gian": "Time", "Máy in & mẫu in": "Printers & templates", "Kết nối": "Connections", "Kênh bán (OTA)": "Sales channels (OTA)", "Đồng bộ hoá": "Synchronization", "Bảo mật": "Security", "Cơ sở dữ liệu": "Database", "Người dùng & phân quyền": "Users & roles", "Hợp đồng & tài sản": "Contracts & assets", "Mạng xã hội": "Social media", "Quản lý tài sản": "Asset management", "Tìm kiếm khách, mã đặt phòng...": "Search guests, booking codes...", "Nhỏ": "Small", "Trung bình": "Medium", "Lớn": "Large", "Chủ sở hữu": "Owner", "Quản lý": "Manager", "Lễ tân": "Reception", "Buồng phòng": "Housekeeping", "Marketing": "Marketing", "Tên cơ sở": "Property details", "Thông tin cơ sở": "Property information", "Thông tin chủ sở hữu": "Owner information", "Thông tin thanh toán": "Payment information", "Thông tin vận hành": "Operating information", "Hình thức cơ sở lưu trú": "Accommodation type", "Tín ngưỡng tôn giáo": "Religion", "Ngôn ngữ mặc định": "Default language", "Cách chọn ngôn ngữ": "Language selection", "Tòa nhà": "Buildings", "Khu, phân khu": "Zones and subzones", "Sơ đồ tầng & phòng": "Floor and room map", "Lưu cài đặt cơ sở": "Save property settings", "Tầng": "Floor", "Số phòng": "Room number", "Loại phòng": "Room type", "Trạng thái": "Status", "Ghi chú": "Notes", "Lưu phòng": "Save room", "Hủy": "Cancel",
  },
  ko: {
    "Tổng quan": "대시보드", "Đặt phòng / Hợp đồng": "예약 / 계약", "Trạng thái phòng": "객실 상태", "Chi phí": "비용", "Khách hàng": "고객", "Dịch vụ": "서비스", "Tiện ích": "편의시설", "Module nâng cao": "고급 모듈", "Cài đặt": "설정", "Chi nhánh": "시설", "Cơ bản": "기본", "Bảo vệ": "보안", "Phòng và giá": "객실 및 요금", "Thanh toán": "결제", "Thời gian": "시간", "Kết nối": "연결", "Bảo mật": "보안", "Quản lý tài sản": "자산 관리", "Tìm kiếm khách, mã đặt phòng...": "고객 또는 예약 번호 검색", "Chủ sở hữu": "소유자", "Quản lý": "관리자", "Lễ tân": "프런트", "Buồng phòng": "객실 관리",
  },
  zh: {
    "Tổng quan": "总览", "Đặt phòng / Hợp đồng": "预订 / 合同", "Trạng thái phòng": "客房状态", "Chi phí": "费用", "Khách hàng": "客户", "Dịch vụ": "服务", "Tiện ích": "设施", "Module nâng cao": "高级模块", "Cài đặt": "设置", "Chi nhánh": "物业", "Cơ bản": "基本", "Bảo vệ": "安全", "Phòng và giá": "客房和价格", "Thanh toán": "付款", "Thời gian": "时间", "Kết nối": "连接", "Bảo mật": "安全", "Quản lý tài sản": "资产管理", "Tìm kiếm khách, mã đặt phòng...": "搜索客户或预订编号", "Chủ sở hữu": "业主", "Quản lý": "经理", "Lễ tân": "前台", "Buồng phòng": "客房服务",
  },
  ja: {
    "Tổng quan": "概要", "Đặt phòng / Hợp đồng": "予約 / 契約", "Trạng thái phòng": "客室状況", "Chi phí": "費用", "Khách hàng": "顧客", "Dịch vụ": "サービス", "Tiện ích": "設備", "Module nâng cao": "拡張モジュール", "Cài đặt": "設定", "Chi nhánh": "施設", "Cơ bản": "基本", "Bảo vệ": "セキュリティ", "Phòng và giá": "客室と料金", "Thanh toán": "支払い", "Thời gian": "時間", "Kết nối": "接続", "Bảo mật": "セキュリティ", "Quản lý tài sản": "資産管理", "Tìm kiếm khách, mã đặt phòng...": "顧客・予約番号を検索", "Chủ sở hữu": "所有者", "Quản lý": "管理者", "Lễ tân": "フロント", "Buồng phòng": "客室清掃",
  },
};

const LocaleContext = createContext<LocaleContextValue>({ language: "vi", languageName: LANGUAGE_NAMES.vi, t: (source) => source });

function supportedLanguage(value: unknown): AppLanguage {
  const code = typeof value === "string" ? value.toLowerCase().split("-")[0] : "";
  return code === "en" || code === "ko" || code === "zh" || code === "ja" || code === "vi" ? code : "vi";
}

function browserLanguage(): AppLanguage {
  if (typeof navigator === "undefined") return "vi";
  return supportedLanguage(navigator.languages?.[0] ?? navigator.language);
}

function normalizeMode(value: unknown): LanguageMode {
  return value === "BROWSER" || value === "IP" ? value : "DEFAULT";
}

export function PmsLocaleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState<AppLanguage>("vi");

  const resolve = useCallback(async () => {
    if (!user) {
      setLanguage("vi");
      return;
    }
    try {
      const response = await api.get<{ data: FacilityLanguageSettings }>("/api/v1/settings/facility");
      const configured = supportedLanguage(response.data?.language);
      const mode = normalizeMode(response.data?.languageMode);
      if (mode === "DEFAULT") {
        setLanguage(configured);
      } else if (mode === "BROWSER") {
        setLanguage(browserLanguage());
      } else {
        const resolved = await api.get<{ language?: string }>("/api/v1/settings/language/resolve");
        setLanguage(supportedLanguage(resolved.language ?? browserLanguage()));
      }
    } catch {
      // Không làm treo PMS nếu cài đặt chưa tồn tại hoặc mạng đang gián đoạn.
      setLanguage(browserLanguage());
    }
  }, [user]);

  useEffect(() => { void resolve(); }, [resolve]);
  useEffect(() => {
    const onLanguageUpdated = () => { void resolve(); };
    window.addEventListener("pms-language-updated", onLanguageUpdated);
    return () => window.removeEventListener("pms-language-updated", onLanguageUpdated);
  }, [resolve]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "vi" ? "ANIO PMS — Quản lý cơ sở" : `ANIO PMS — ${LANGUAGE_NAMES[language]}`;
  }, [language]);

  const value = useMemo<LocaleContextValue>(() => ({
    language,
    languageName: LANGUAGE_NAMES[language],
    t: (source) => MESSAGES[language][source] ?? source,
  }), [language]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function usePmsLocale() {
  return useContext(LocaleContext);
}
