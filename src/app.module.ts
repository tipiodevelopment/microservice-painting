import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ImageModule } from './modules/image/image.module';
import { BrandModule } from './modules/brand/brand.module';
import { PaintModule } from './modules/paint/paint.module';
import { ColorSearchesModule } from './modules/color-searches/color-searches.module';
import { PalettesModule } from './modules/palettes/palettes.module';
import { WhiteListModule } from './modules/white-list/white-list.module';

import { ConfigModule } from '@nestjs/config';
import { ConfigurationModule } from './config/config.module';
import { ConfigService } from './config/providers/config.service';
import { Configuration } from './config/utils/config.keys';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './interceptors/log/logging.interceptor';
import { ResponseInterceptor } from './interceptors/response/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
    }),
    ConfigurationModule,
    AuthModule,
    ImageModule,
    BrandModule,
    PaintModule,
    ColorSearchesModule,
    PalettesModule,
    WhiteListModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {
  static basePath: string;
  static appHost: string;
  static redisUrl: string;
  static docUrl: string;
  static port: number | string;

  constructor(private readonly _configService: ConfigService) {
    AppModule.port = this._configService.get(Configuration.PORT);
    AppModule.basePath = this._configService.get(Configuration.BASE_PATH);
    AppModule.docUrl = this._configService.get(Configuration.BASE_PATH)
      ? `/${this._configService.get(Configuration.BASE_PATH)}/docs`
      : '/docs';

    // AppModule.redisUrl = `redis://${this._configService.get(Configuration.CACHE_USER)}:${this._configService.get(Configuration.CACHE_PASSWORD)}@${this._configService.get(Configuration.CACHE_HOST)}:${this._configService.get(Configuration.CACHE_PORT)}`;
    // console.log(
    //   `redis://${this._configService.get(Configuration.CACHE_USER)}:${this._configService.get(Configuration.CACHE_PASSWORD)}@${this._configService.get(Configuration.CACHE_HOST)}:${this._configService.get(Configuration.CACHE_PORT)}`,
    // );
    AppModule.appHost = this._configService.get(Configuration.APP_HOST);
  }
}
