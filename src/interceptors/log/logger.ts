import { createLogger, transports, format } from 'winston';
import * as datadogWinston from 'datadog-winston';

import { ConfigService } from '../../config/providers/config.service';
import { Configuration } from '../../config/utils/config.keys';

const configService = new ConfigService();
const DATADOG_API_KEY = configService.get(Configuration.DATADOG_API_KEY);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = process.env.SERVICE_NAME || 'paint-microservice';

if (!DATADOG_API_KEY) {
  console.warn(
    'DATADOG_API_KEY no está configurado. Los logs no se enviarán a Datadog.',
  );
}
console.log('DATADOG_API_KEY', DATADOG_API_KEY);
console.log('NODE_ENV', NODE_ENV);
console.log('SERVICE_NAME', SERVICE_NAME);

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: SERVICE_NAME },
  transports: [new transports.Console()],
});

if (DATADOG_API_KEY) {
  logger.add(
    new datadogWinston({
      host: 'http-intake.logs.datadoghq.eu',
      apiKey: DATADOG_API_KEY,
      service: SERVICE_NAME,
      ddsource: 'nodejs',
      ddtags: `env:${NODE_ENV}`,
    }),
  );
}

export { logger };
