FROM php:8.3-cli-alpine

# Create non-root user for security
RUN adduser -D -u 1000 -h /app phpuser

WORKDIR /app

# Copy only webapp files (Dockerfile, .env, docker/ stay out via .dockerignore)
COPY webapp/ /app/

# Set proper ownership
RUN chown -R phpuser:phpuser /app

# Drop privileges
USER phpuser

EXPOSE 8080

# PHP built-in server with router: every request goes through router.php
# which enforces authentication before serving any file
CMD ["php", "-S", "0.0.0.0:8080", "router.php"]
