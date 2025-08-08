import * as fs from 'fs';
import { parse } from 'dotenv';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly envConfig: { [key: string]: string };

  constructor() {
    const envFilePath = `${__dirname}/../../../.env`;
    if (this.notExistsPath(envFilePath)) {
      process.exit(0);
    }
    this.envConfig = parse(fs.readFileSync(envFilePath));
  }

  private notExistsPath(envFilePath: string): boolean {
    const existsPath = fs.existsSync(envFilePath);
    if (!existsPath) {
      console.log('.env file does not exist');
      return true;
    }

    return false;
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
