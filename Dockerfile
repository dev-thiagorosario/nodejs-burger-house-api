FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

ENV NODE_ENV=development

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev:docker"]
