# syntax=docker/dockerfile:1

# ---------- Frontend ----------
FROM node:22-alpine AS frontend
WORKDIR /src/waterfix

COPY waterfix/package.json waterfix/package-lock.json ./
RUN npm ci

COPY waterfix/ ./
# Пустое значение = запросы идут на /api того же домена
ARG VITE_API_URL=""
ARG VITE_YANDEX_MAPS_KEY=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_YANDEX_MAPS_KEY=$VITE_YANDEX_MAPS_KEY
RUN npm run build

# ---------- Backend ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend
WORKDIR /src

COPY WaterFix.API/WaterFix.API.csproj WaterFix.API/
RUN dotnet restore WaterFix.API/WaterFix.API.csproj

COPY WaterFix.API/ WaterFix.API/
RUN dotnet publish WaterFix.API/WaterFix.API.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# ---------- Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true

COPY --from=backend /app/publish ./
COPY --from=frontend /src/waterfix/dist ./wwwroot/

# wwwroot/uploads — фото водоматов, App_Data — приватные фото/видео заявок
RUN mkdir -p /app/wwwroot/uploads /app/App_Data \
    && chown -R app:app /app/wwwroot /app/App_Data

USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "WaterFix.API.dll"]
