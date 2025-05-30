import { createLogger, transports, format } from 'winston';
import * as datadogWinston from 'datadog-winston';

import { ConfigService } from '../../config/providers/config.service';
import { Configuration } from '../../config/utils/config.keys';

const configService = new ConfigService();
const DATADOG_API_KEY = configService.get(Configuration.DATADOG_API_KEY);
const BRANCH = configService.get(Configuration.BRANCH);
const SERVICE_NAME = `${BRANCH}-paint-microservice`;

if (!DATADOG_API_KEY) {
  console.warn(
    'DATADOG_API_KEY no está configurado. Los logs no se enviarán a Datadog.',
  );
}

const logger = createLogger({
  format: format.combine(
    format.errors({ stack: true }),
    format.metadata(),
    format.timestamp(),
    format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`,
    ),
  ),
  transports: [new transports.Console()],
});

if (DATADOG_API_KEY) {
  logger.add(
    new datadogWinston({
      hostname: SERVICE_NAME,
      apiKey: DATADOG_API_KEY,
      service: SERVICE_NAME,
      ddsource: 'nodejs',
      ddtags: `env:${BRANCH},service:${SERVICE_NAME}`,
      site: 'datadoghq.eu',
      intakeRegion: 'eu',
      logLevel: 'info',
      handleExceptions: true,
      handleRejections: true,
    }),
  );
}

export { logger };
