# syntax=docker/dockerfile:1

# Build stage: PHP is required because the Wayfinder Vite plugin runs `php artisan` during `npm run build`.
FROM serversideup/php:8.5-cli AS build
USER root

COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN composer dump-autoload --optimize --no-dev --no-interaction \
    && APP_KEY="$(php artisan key:generate --show)" npm run build \
    && rm -rf node_modules

# Runtime stage: Nginx + PHP-FPM, listens on 8080. AUTORUN_ENABLED runs migrations and Laravel caches on start.
FROM serversideup/php:8.5-fpm-nginx

ENV AUTORUN_ENABLED=true \
    PHP_OPCACHE_ENABLE=1 \
    HEALTHCHECK_PATH=/up

RUN php -m | grep -qi pdo_pgsql

COPY --from=build --chown=www-data:www-data /var/www/html /var/www/html
