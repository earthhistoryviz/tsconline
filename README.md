# 🗺️Time Scale Creator Online Documentation

More Documentation Available [Here](https://earthhistoryviz.github.io/tsconline/)

## What are we doing?

Our goal with this project is to increase accessibility of TSCreator to geologists everywhere by porting the java application TSCreator to an online interface. See [here](https://timescalecreator.org/index/index.php) for information on TSCreator. If you haven't already, ask a team member for the java application and take some time to go through the java application's quick start guide and familiarize yourself with the interface. We intend to implement every feature of the java program on this website.

This project utilizes React.js with Typescript and Java.

The current website in production is available [here](https://tsconline.timescalecreator.org) for reference.

We additionally have a development environment at [here](https://dev.timescalecreator.org).

## Get Started

Before we start learning how things work, let's setup our dev environment.

You'll first want to gain access to write access so you can start pull requests, so ask the team lead for permissions to the [repo](https://github.com/earthhistoryviz/tsconline).

Additionally, you'll want access to the dropbox for the required datapacks and jars will be pulled from

Now, clone this repo to your local device:
```
git clone git@github.com:earthhistoryviz/tsconline.git
```

### Environment Requirement
- **Windows:** You must run this project inside **WSL2** (Windows Subsystem for Linux 2) with an Ubuntu-based distribution.  
- **Linux / macOS:** You should be able to run the project directly in your system.


### 1. Installing nvm and Node.js v20

First, check if npm is installed by running:

  ```bash
  npm -v
  ```

If you see a version number, npm is installed. If not, or if the version is not v20, install nvm first:
  - **MACOS**
    - Visit the [nvm repo](https://github.com/nvm-sh/nvm) and install `nvm`
  - **WINDOWS**
    - use [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)

  Then run:
  ```bash
  nvm install 20
  nvm use 20
  ```

### 2. Installing Yarn Globally

  ```bash
  npm install -g yarn
  ```

### 3. Installing Java 8
First, check if java is installed by running:
  ```bash
  java -version
  javac -version
  ```
The output should be similar to ```openjdk version "1.8.0_402"``` and ```javac 1.8.0_402```. If java 8 is not installed, run the following: 

  ```bash
  sudo apt-get install openjdk-8-jdk
  ```
  or

  ```bash
  sudo apt install openjdk-8-jdk
  ```

### 4. Install Dependencies & Build
```bash
yarn
yarn build
```

### 5. Setup Environment Variables

Take the .env file (ask a team member for the file) and place it into the /server folder. Rename the file to be ".env" if it was named otherwise. 

### 6. Run the dev server
```bash
yarn dev
```
This step may take some time as it pulls all required datapacks from Dropbox. The site should open at http://localhost:5173.



## Optional

### Manual setup

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

### Using docker to run the website
- Simply run
```bash
docker-compose up -d
```
or
```bash
docker compose up -d
```
depending on which version of compose you have. The website should now be available at the links listed above.

This comes with a problem where docker will change the ownership of files, preventing you from running the website using the steps above without docker. To fix this run
```bash
sudo chown -R <user> <project-directory>
```

