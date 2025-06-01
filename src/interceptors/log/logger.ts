import winston, { createLogger, format, Logger } from 'winston';
// import expressWinston from 'express-winston';
import { ConfigService } from '../../config/providers/config.service';
import { Configuration } from '../../config/utils/config.keys';
import {
  ConsoleTransportInstance,
  HttpTransportInstance,
} from 'winston/lib/winston/transports';
const configService = new ConfigService();
const DATADOG_API_KEY = configService.get(Configuration.DATADOG_API_KEY);
const BRANCH = configService.get(Configuration.BRANCH);
const SERVICE_NAME = `${BRANCH}-paint-microservice`;

if (!DATADOG_API_KEY) {
  console.warn(
    'DATADOG_API_KEY no está configurado. Los logs no se enviarán a Datadog.',
  );
}

console.log(DATADOG_API_KEY);
console.log(SERVICE_NAME);
console.log(BRANCH);

const transportConsole = new winston.transports.Console({
  format: format.combine(
    format.errors({ stack: true }),
    format.metadata(),
    format.timestamp(),
    format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`,
    ),
  ),
});

const transports: (HttpTransportInstance | ConsoleTransportInstance)[] = [
  transportConsole,
];

if (DATADOG_API_KEY) {
  console.info('----- Init transportDatadog ----- ');
  console.log(
    `/v1/input/${DATADOG_API_KEY}&ddsource=nodejs&service=${SERVICE_NAME}`,
  );
  transports.push(
    new winston.transports.Http({
      host: 'http-intake.logs.datadoghq.eu',
      // path: `/v1/input/${DATADOG_API_KEY}&ddsource=nodejs&service=${SERVICE_NAME}`,
      path: `/api/v2/logs?dd-api-key=${DATADOG_API_KEY}&ddsource=nodejs&service=${SERVICE_NAME}`,
      ssl: true,
      port: 443,
    }),
  );
  console.info('----- Finish transportDatadog ----- ');
}

const logger: Logger = createLogger({
  level: 'debug',
  exitOnError: false,
  transports,
});

export default logger;
