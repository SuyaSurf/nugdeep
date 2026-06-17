# Flutter build stage for CI/CD
FROM ghcr.io/cirruslabs/flutter:stable AS builder

WORKDIR /app
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .
RUN flutter build apk --release

# Output artifacts in /app/build/app/outputs/flutter-apk/
