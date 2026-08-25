# ADDITION: PMS + AUTOMATION SYSTEM REQUIREMENTS

> **Bắt buộc khi chỉnh code:** đọc `AGENTS.md` trước. Mọi thay đổi phải ở đúng
> `D:\hotel\OSS`; Docker/LAN tự cập nhật qua watcher sau khi typecheck. Không dùng
> các cổng Docker 3000/3100/4200 cho chế độ dev và không sửa trực tiếp container.

## 1. Objective

Extend the existing kiosk management system into a full Smart Hotel Operating System including:

- PMS (Property Management System)
- Channel Manager
- AI Pricing Engine
- IoT Energy Management
- CRM & Marketing Automation

The system must focus on:

- Reducing operational cost
- Increasing revenue
- Reducing dependency on OTA
- Automating hotel operations

---

## 2. Core Modules

### 2.1 PMS Core

Must support:

- Room management
- Booking lifecycle
- Check-in / Check-out
- Walk-in booking
- Group booking
- Room status management

---

### 2.2 Channel Manager

Must support:

- OTA integration (Booking, Agoda, Airbnb)
- Inventory sync
- Price sync
- Booking ingestion
- Overbooking prevention

---

### 2.3 Direct Booking Engine

Must support:

- Website booking
- QR booking
- Payment integration
- Voucher system

---

### 2.4 AI Pricing Engine

Phase 1:

- Rule-based dynamic pricing

Phase 2:

- AI prediction model

Inputs:

- Occupancy rate
- Historical data
- Events
- Competitor pricing

Outputs:

- Suggested price per day

---

### 2.5 IoT Integration

Must integrate with:

- Room electricity control
- Air conditioning
- Smart switches

Rules:

- Turn off after checkout
- Pre-activate before check-in
- Optimize energy consumption

---

### 2.6 Kiosk Integration

Must connect:

- Booking → Kiosk check-in
- Payment → Room access
- Room assignment → Card issuing

---

### 2.7 Revenue Dashboard

Must include:

- Daily revenue
- Monthly revenue
- Occupancy rate
- ADR
- RevPAR

---

### 2.8 CRM & Marketing

Must support:

- Customer segmentation
- Automated messaging
- Retargeting campaigns

---

## 3. Automation Requirements

The system must automate:

- Booking → Check-in → Room activation → Checkout → Marketing loop

---

## 4. Architecture

Must be microservice-ready:

- PMS service
- Channel manager service
- AI pricing service
- IoT service
- CRM service

---

## 5. Data Requirements

Must track:

- Booking data
- Revenue data
- Energy usage
- Device status
- Customer behavior

---

## 6. KPI Targets

System must be designed to achieve:

- Reduce staff cost by 30–50%
- Reduce energy cost by 20–40%
- Increase revenue by 10–25%
- Reduce OTA dependency

---

## 7. Constraints

- Must work offline-first
- Must support multi-property
- Must support real-time sync
- Must integrate with kiosk system
- Must be scalable to thousands of properties

---

## 8. Deliverables

- PMS database schema
- Booking flow
- Channel sync logic
- Pricing engine logic
- IoT rule engine
- Dashboard UI
- API integration spec
