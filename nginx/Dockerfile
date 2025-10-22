FROM nginx:alpine

# Nginx 메인 설정 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 템플릿 파일 복사
COPY conf.d/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY conf.d/default-http-only.conf.template /etc/nginx/conf.d/default-http-only.conf.template

# entrypoint 스크립트 복사
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 기본 healthcheck 페이지 생성
RUN echo "OK" > /usr/share/nginx/html/health

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

