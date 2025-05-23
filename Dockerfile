FROM node:20



WORKDIR /usr/src/app

COPY charts ./charts

COPY package.json ./
RUN yarn install

ARG ENV_FILE
COPY $ENV_FILE .env

COPY . ./

RUN echo "=== CONTENIDO .env ===" && cat .env

EXPOSE 8000
RUN yarn build
CMD ["yarn", "start"]