FROM node:20-alpine

# Install PostgreSQL client tools (pg_dump, psql, pg_restore)
RUN apk add --no-cache postgresql-client

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 4000

CMD ["node", "src/index.js"]