# tsconline

---

## Structure

---

This monorepo has 3 workspaces: `app`, `shared`, and `server`. Anything shared between
the app and server (i.e. types and assertions) goes in `shared`.

The server run on port 3000 by default, and will serve the following routes:
| Route | Description |
|------------------------------|---------------------------------------------------------|
| /_ | serves any files in `app/dist` |
| GET /presets | node process reads server/public/presets to build JSON |
| POST /charts | POST settings file here to make a chart, url returned |
| GET /public/_ | GET anything in the server/public folder (i.e. charts) |
| GET /datapackinfo/:files | GET column settings info, map info, and grabs map images from decrypted datapacks |

## Running in Production

---

The monorepo is missing 2 things you need to get started: a jar file and secrets.txt.

1. To run for production, clone the monorepo:

```bash
git clone git@github.com:earthhistoryviz/tsconline.git
cd tsconline
```

2. Create a secrets.env file to hold your VNC password (to view the GUI if needed):

```bash
echo "VNC_PASSWORD=passwordyouwant" > secrets.env
```

3. Then run a temporary docker container to build everything with the right versions of
   yarn/node/etc.:

```bash
docker-compose run tsconline bash
# yarn && yarn build
```

4. Then **Put a jar file in server/assets/jars** and **Put it's name in server/assets/config.json**.

5. Bring up the server:

```bash
docker-compose up -d
```

6. Trying loading the page at [http://dev.timescalecreator.org:3000]

7. There are instructions printed out when the container starts about how to connect a
   VNC viewer if you want to do that. To see the instructions, looks at the logs:

```bash
docker-compose logs
```

## dev

---

To dev, each workspace has it's own "watch and rebuild"-style development command.
The app can do it in two ways depending on whether you want the vite dev server
or if you are trying to test it through the node server. The node server only
serves files built in `app/dist/`, which the vite dev server does not modify.
So if you are loading through the node server, you have to get vite to make
the production build in `dist/` whenever you change files instad of using
the vite dev server.

If you are on a Mac, you should be fine to use your local yarn (no need to run
the docker). If you are on windows, you need to run these commands in Docker:

```bash
docker-compose exec tconline bash
```

note this depends on the tsconline service being up and running. If it is not,
use `docker-compose run tsconline bash` instead.

#### Server

---

```bash
cd server
yarn dev
```

#### Shared

---

```bash
cd shared
yarn dev
```

#### App with vite dev server:

---

```bash
cd app
yarn dev
```

#### App through node server:

---

```bash
cd app
yarn build-watch
```
