# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
# Placeholder - frontend to be implemented separately
RUN echo "<html><body><h1>School Admission System</h1></body></html>" > index.html

# ---- Runtime stage ----
FROM nginx:alpine AS runtime
COPY --from=build /app/index.html /usr/share/nginx/html/index.html
EXPOSE 80
