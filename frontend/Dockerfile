# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application files and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built assets from build stage to nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration if needed, or use default
# EXPOSE port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
