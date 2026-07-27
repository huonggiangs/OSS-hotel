# Image dùng để chạy migrate + seed một lần khi khởi động hệ thống lần đầu
# (xem service "migrate" trong docker-compose.yml).
FROM node:20-alpine
WORKDIR /app/database
COPY database/package.json ./
RUN npm install
COPY database ./
CMD ["sh", "-c", "npm run migrate && npm run seed"]
