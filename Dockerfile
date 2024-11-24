# Stage 1: build
FROM node:22.11.0 AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: production
FROM node:22.11.0-alpine AS production
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
COPY templates ./templates
EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]