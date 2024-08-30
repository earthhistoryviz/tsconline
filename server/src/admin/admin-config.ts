import { readFile, writeFile } from "fs/promises";
import { assertAdminConfig } from "../types";
import { AdminConfigType } from "../types";
import { Mutex } from "async-mutex";
import { DatapackMetadata } from "@tsconline/shared";

const ADMIN_DEFAULT_CONFIG: AdminConfigType = {
  datapacks: []
};

export class AdminConfig {
  private mutex = new Mutex();
  private _adminConfig: AdminConfigType;
  private _filepath: string;
  constructor(filepath: string) {
    this._filepath = filepath;
    this._adminConfig = ADMIN_DEFAULT_CONFIG;
  }
  /**
   * Load the admin config file
   */
  async loadFile() {
    const release = await this.mutex.acquire();
    try {
      const raw = await readFile(this._filepath, "utf8");
      const adminconfig = JSON.parse(raw);
      assertAdminConfig(adminconfig);
      this.setAdminConfig(adminconfig);
    } catch (e) {
      if (e instanceof Error && (e as NodeJS.ErrnoException).code === "ENOENT") {
        console.error("Admin config file not found. Loading default admin config.");
        this.setAdminConfig(ADMIN_DEFAULT_CONFIG);
      }
      this.handleError(e);
    } finally {
      release();
    }
  }
  /**
   * Save the admin config to the file
   */
  async saveFile() {
    const release = await this.mutex.acquire();
    try {
      await writeFile(this._filepath, JSON.stringify(this._adminConfig, null, 2));
    } catch (e) {
      this.handleError(e);
    } finally {
      release();
    }
  }
  /**
   * set the admin config
   * @param adminConfig the admin config
   */
  async setAdminConfig(adminConfig: AdminConfigType) {
    this._adminConfig = adminConfig;
  }

  /**
   * get the admin config
   * @returns admin config
   */
  getAdminConfig() {
    return this._adminConfig;
  }

  /**
   * remove a datapack from the admin config
   * @param datapack the datapack to remove
   */
  async removeAdminConfigDatapack(datapack: DatapackMetadata) {
    if (this._adminConfig.datapacks.find((d) => d.title === datapack.title)) {
      this._adminConfig.datapacks = this._adminConfig.datapacks.filter((d) => d.title !== datapack.title);
      await this.saveFile();
    } else {
      this.handleError(`Datapack ${datapack.title} not found in admin config`);
    }
  }
  /**
   * add a datapack to the admin config
   * @param datapack the datapack to add
   */
  async addAdminConfigDatapack(datapack: DatapackMetadata) {
    if (!this._adminConfig.datapacks.find((d) => d.title === datapack.title)) {
      this._adminConfig.datapacks.push(datapack);
      await this.saveFile();
    } else {
      this.handleError(`Datapack ${datapack.title} already in admin config`);
    }
  }
  /**
   * reset the admin config to the default config
   */
  async resetAdminConfig() {
    this._adminConfig = ADMIN_DEFAULT_CONFIG;
    await this.saveFile();
  }
  /**
   * error handler
   * @param e the error to handle
   */
  handleError(e: unknown) {
    if (e instanceof Error) {
      console.error(e.message);
    } else {
      console.error(e);
    }
  }
}
