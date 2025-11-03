FROM node:20-alpine


# Install corepack for yarn
RUN corepack enable

WORKDIR /app

# Copy root manifest files
COPY package.json yarn.lock ./

# Copy MCP’s manifest
COPY mcp/package.json ./mcp/

# Install only MCP deps
RUN yarn workspaces focus mcp --all --production

# Copy full repo (so MCP code + any shared code is available)
COPY . .

WORKDIR /app/mcp

EXPOSE 3001
CMD ["yarn", "start"]