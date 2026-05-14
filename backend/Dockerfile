FROM node:20-alpine

WORKDIR /app

ARG GIT_COMMIT_SHA=
ARG GIT_BRANCH=
ARG BUILD_TIME_ISO=
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA
ENV GIT_BRANCH=$GIT_BRANCH
ENV BUILD_TIME_ISO=$BUILD_TIME_ISO

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

EXPOSE 3001 8080

CMD ["npm", "start"]
