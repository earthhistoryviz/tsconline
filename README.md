# tsconline

---

## Structure

---

This monorepo has 3 workspaces: `app`, `shared`, and `server`. Anything shared between
the app and server (i.e. types and assertions) goes in `shared`.

The server run on port 3000 by default, and will serve the following routes:
| **Route** | **Description** |
|----------------------------|---------------|
| `/_` | Serves any files in `app/dist`. |
| `/presets` | Node process reads `server/public/presets` to build JSON. |
| `/charts:usecache` | POST settings file here to make a chart, URL returned. |
| `/public/_` | GET anything in the `server/public` folder (i.e., charts). |
| `/datapackinfo/:files` | GET column settings info, map info, and grabs map images from decrypted datapacks. |
| `/removecache` | POST removes cache of previously generated charts |
| `/pdfstatus:hash` | GET whether the pdf is readable from the hashed generated chart|

## Initial Setup

---

1. To run for production, clone the monorepo:

```bash
git clone git@github.com:earthhistoryviz/tsconline.git
cd tsconline
```

2. Run setup in the 'tsconline' directory to ensure that all workspaces are properly built and installed with the correct packages

```bash
yarn setup
```

The server requires 2 jar files to operate. Contact a team member to direct you to the TSCreator jar and decryption jar

3. Put the jars within server/assets/jars. If the names are different than what is described in server/assets/config.json, then make the required changes.

## Follow the following steps if you want to setup the website to service remote requests

The monorepo is missing a secrets.env file for setting up the docker container

1. Create a secrets.env file to hold your VNC password (to view the GUI if needed):

```bash
echo "VNC_PASSWORD=passwordyouwant" > secrets.env
```

2. Run a temporary docker container to build everything with the right versions of
   yarn/node/etc.:

```bash
docker-compose run tsconline bash
```

3. Then **Put a jar file in server/assets/jars** and **Put it's name in server/assets/config.json**.

4. Bring up the server:

```bash
docker-compose up -d
```

5. Trying loading the page at [http://dev.timescalecreator.org:3000]

6. There are instructions printed out when the container starts about how to connect a
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
