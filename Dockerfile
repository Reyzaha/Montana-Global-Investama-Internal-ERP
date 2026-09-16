FROM php:8.2-apache

# 1. Install dependencies & PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo_mysql gd zip opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. Enable Apache modules
RUN a2enmod rewrite headers

# 3. Configure PHP settings (upload size, execution time, timezone)
RUN { \
    echo 'upload_max_filesize = 50M'; \
    echo 'post_max_size = 50M'; \
    echo 'memory_limit = 256M'; \
    echo 'max_execution_time = 300'; \
    echo 'date.timezone = Asia/Jakarta'; \
    echo 'display_errors = Off'; \
    echo 'log_errors = On'; \
    echo 'error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT'; \
} > /usr/local/etc/php/conf.d/custom-erp.ini

# 4. Set working directory
WORKDIR /var/www/html

# 5. Copy application source code
COPY . /var/www/html/

# 6. Ensure upload & storage directories exist with proper permissions
RUN mkdir -p /var/www/html/backend/uploads \
             /var/www/html/backend/storage \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/backend/uploads \
    && chmod -R 775 /var/www/html/backend/storage

EXPOSE 80

CMD ["apache2-foreground"]
