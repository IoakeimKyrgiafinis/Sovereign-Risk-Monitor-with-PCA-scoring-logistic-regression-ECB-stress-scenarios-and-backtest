FROM node:18-alpine as build
WORKDIR /app

# Install dependencies first (cached unless package.json changes)
COPY package*.json ./
RUN npm install

# Copy ALL frontend files (including index.html and src/)
COPY . .

# Run Vite build AFTER copying updated index.html
RUN npm run build

# Serve with nginx or static server
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]