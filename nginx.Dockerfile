FROM nginx:alpine-slim
COPY frontend/dist /usr/share/nginx/html
COPY nginx.host.conf /etc/nginx/conf.d/default.conf
