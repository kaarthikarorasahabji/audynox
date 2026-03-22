# production environment - serve pre-built static files
FROM nginx:1.23.2-alpine
RUN rm -rf /etc/nginx/conf.d
COPY ./docker/nginx/default.conf /etc/nginx/conf.d/
COPY ./build /usr/share/nginx/html
RUN chmod -R +r /usr/share/nginx/html/
EXPOSE 7860
CMD ["nginx", "-g", "daemon off;"]
