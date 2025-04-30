FROM node:20

EXPOSE 3000

CMD yarn start

WORKDIR /usr/src/app

COPY charts ./charts

COPY package.json ./
RUN yarn install

ARG ENV_FILE
COPY $ENV_FILE .env

COPY . ./

RUN yarn build