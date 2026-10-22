# ---------- 1-bosqich: build ----------
FROM node:24-alpine AS build
WORKDIR /app

# Avval faqat package fayllarini nusxalaymiz — kod o'zgarsa ham
# bog'liqliklar qatlami keshdan olinadi va build tezroq bo'ladi
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production uchun keraksiz (dev) paketlarni olib tashlaymiz
RUN npm prune --omit=dev

# ---------- 2-bosqich: ishga tushirish ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

# Build bosqichidan faqat kerakli narsalarni olamiz
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Xavfsizlik uchun root emas, oddiy foydalanuvchi bilan ishga tushiramiz
USER node

EXPOSE 3000
CMD ["node", "dist/main"]
