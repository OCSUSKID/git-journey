FROM node:18-alpine
WORKDIR /app

# install deps
COPY package.json package-lock.json* ./
RUN npm install --production

# app
COPY . ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
