# Server

---

## Setup

---

### assets

---

We set up the assets folder to contain all supporting files. The jars are not found on the public repo since they contain sensitive information on private applications.

```lua
server
`-- assets
    |-- datapacks
    |   |-- *.dpk
    |   |-- *.mdpk
    |   |-- *.map
    |   `-- *.txt
    |-- decrypted
    |   `--[decrypted datapacks]
    |-- jars
    |   | -- TSCreator.jar
    |   ` -- decrypt.jar
    `-- configs.json
```

We keep datapacks used on the server in this folder `assets/datapacks`. The configs.json folder will detail which of this datapacks are to be used in the `activeDatapacks` field.

Again, make sure to denote the name of your jars in their respective fields. EX. (`decryptionJar: "assets/jars/decrypt.jar"`)

`configs.json` contains all the information of where assets are to be used on the server side. This is asserted in `server/src/types.ts`. Any changes to `configs.json` will need to be additionally changed in the `types.ts` files.

---

### public

---

We hold all the service files here for the app. The app is able to access all files so do not put any sensitive information here (including the decrypted datapacks and jars). The presets, mapimages, and charts cache are all located here.

#### public/presets

The presets in `public/presets` will contain specific configurations of certain datapack combinations. The naming convention of these will be `public/presets/*-*` (EX: 001-TSC2020). The `config.json` will hold the information for each preset. **Right now, the settings parser, xml to json, and json to xml functions are not working so the settings are currently default.**

**_Ask Professor Ogg for any preset ideas._**

#### public/charts

This holds the charts in a hashed directory. The hash consists of an `md5` hash of the chart settings and chart datapacks. This ensures that if they request the same chart, we can just use the cached version. Both the chart and settings file used in the java jar are kept here for cache use.

#### public/mapimages

This holds any map images if the datapacks used are those with map points. Everytime the app requests new datapack info, we delete this directory. The app will service these map images for the settings map points.
