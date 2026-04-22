FROM node:18

WORKDIR /app/zoon-clone

COPY . /app/zoon-clone/

RUN npm install && npm run build

EXPOSE 4100

CMD [ "npm", "run", "start" ]