# 🗺️Time Scale Creator Online Documentation

## What are we doing?

Our goal with this project is to increase accessibility of TSCreator to geologists everywhere by porting the java application TSCreator to an online interface. See [here](https://timescalecreator.org/index/index.php) for information on TSCreator. If you haven't already, ask a team member for the java application and take some time to go through the java application's quick start guide and familiarize yourself with the interface. We intend to implement every feature of the java program on this website.

This project utilizes React.js with Typescript and Java.

The current website in production is available [here](https://tsconline.timescalecreator.org) for reference.

We additionally have a development environment at [here](https://dev.timescalecreator.org).

## Get Started

Before we start learning how things work, let's setup our dev environment.

You'll first want to gain access to write access so you can start pull requests, so ask the team lead for permissions to the [repo](https://github.com/earthhistoryviz/tsconline).

Additionally, you'll want access to the dropbox for the required datapacks and jars (JAVA YAY) which should be in the Supporting TSCOnline Files folder

Only take the newest jar date and make sure you take the `TSCreatorBASE-8.1_DDMonthYYYY.jar` and the `datapack-decrypter_DDMonYYYY.jar` and put them in `server/assets/jars`
Put all the datapacks in `datapacks` into `server/assets/datapacks`

### Ensure you have a package manager

1. **npm** (note, you will still need `nvm` for both `Chocolatey` and `Homebrew`)

- First, check if npm is installed by running:

  ```bash
  npm -v
  ```

- If you see a version number, npm is installed. If not and you would like `npm`, installing `Node` in a future step will come with a bundled `npm`

2. **Chocolatey** ([more](https://chocolatey.org/installhttps://chocolatey.org/install))

- If Chocolatey is not installed follow these steps
- Run `Get-ExecutionPolicy`. If it returns `Restricted`, then run `Set-ExecutionPolicy AllSigned` or `Set-ExecturionPolicy Bypass -Scope Process`.
- Now install it by running the following command in an elevated (admin) PowerShell:
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
  ```

3. **Homebrew**

- If Homebrew is not already installed, install it by running:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

### Installing nvm and Node.js v20

- **MACOS**
  - Visit the [nvm repo](https://github.com/nvm-sh/nvm) and install `nvm`
- **WINDOWS**
  - use [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
- Then run these commands to install the `node` version 20 that the repo uses and `npm` which it should come bundled with

  ```bash
  nvm install 20
  nvm use 20
  ```

### Installing Yarn Globally

1. **npm**

- You can check if `npm` is installed by running `npm -v`. If you see a version number, `npm` is installed and you can run the following command to install `yarn` (our package manager for the repo) globally.

```bash
npm install -g yarn
```

2. **Using Chocolatey**

```powershell
choco install yarn
```

3. **Using Homebrew**

```bash
brew install yarn
```

### Setting up locally hosted website

1. On first time being in the repo, `cd` into `tsconline` (or whatever you named the repo and ensure you are in the root dir) and run

```bash
yarn setup
```

- Make sure to note the exit code and make sure it is 0. If not, try running
```bash
sudo apt-get install -y python3 make g++
```

- If above doesn't seem to work, print out the `build.log` using `cat` and ask a team member for assistance (or download whatever it doesn't have)

- For reference, this will run `yarn install` and `yarn build` to download all the packages we use internally (dev and production) and additionally compile all the `Typescript` files (`.ts`) into `Javascript` files (`.js`)

2. **Manual setup**

- Open two (or four) terminals and run these commands in each

```bash
cd app && yarn dev
```

```bash
#optional, this is to rebuild/compile on file changes in server
cd server && yarn dev
```

```bash
#optional, this is to rebuild/compile on file changes in shared
cd shared && yarn dev
```

```bash
cd server && yarn start
```

- The `yarn start` in `server` and `yarn dev` in `app` will put up our backend server on your machine and the `app` will go live at `http://localhost:5173` whereas the server will service requests from port `3000` at `http://localhost:3000`

3. **Quick Website Setup**

- If you want to quickly setup the website without opening more than one terminal, run

```bash
./start.sh
```

- Don't forget to run this command after you finish, otherwise these terminals will hide in your background

```bash
./stop.sh
```

NOTE: this doesn't work on some machines unfortunately.

### If above doesn't start/work

- No worries if the above doesn't work. We can use docker to make a fake environment for you to run the server on.

1. Create a `secrets.env` file in the root dir

```bash
touch secrets.env
```

2. Run the container

```bash
docker-compose up -d
```
or
```bash
docker compose up -d
```
depending on which version of compose you have.

3. Try opening the website [here](http://localhost:5173)

4. Debug with

```bash
docker-compose logs
```
or
```bash
docker compose logs
```

This comes with a problem where docker will change the ownership of files, preventing you from running the website using the steps above without docker. To fix this run
```bash
sudo chown -R <user> <project-directory>
```

## Structure

This monorepo has 3 workspaces: [app](#general-app-structure), [shared](#general-shared-structure), and [server](/server.md#server). Anything shared between
the app and server (i.e. types and assertions) goes in `shared`. Keep as much backend work like parsing on the `server` end. The only exception to this is the `parse-settings.ts` which we keep app side.
