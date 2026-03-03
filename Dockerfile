FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY data ./data
COPY index.html ./index.html
COPY dashboard.html ./dashboard.html

ENV PORT=8787
ENV HOST=0.0.0.0

EXPOSE 8787

CMD ["node", "server/index.js"]
