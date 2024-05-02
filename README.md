# Welcome to Remix + Vite!

📖 See the [Remix docs](https://remix.run/docs) and the [Remix Vite docs](https://remix.run/docs/en/main/guides/vite) for details on supported features.

## Docker
You can try this service using this docker-compose.yml file:

```yaml
version: '3'
services:
  comick-dl:
    image: ghcr.io/juandjara/comick-downloader:latest
    container_name: comick-downloader
    restart: unless-stopped
    environment:
      REDIS_URL=cdl_redis:6379
      STORAGE_PATH=/app/storage
    volumes:
      - /<manga_folder>:/app/storage
    ports:
      - 3000:3000
    depends_on:
      - cdl_redis

  cdl_redis:
    container_name: cdl_redis
    hostname: cdl_redis
    image: eqalpha/keydb
    restart: unless-stopped
    ports:
      - 6379:6379
```

## Development

Run the Vite dev server:

```shellscript
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`
