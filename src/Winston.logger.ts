import { format, LoggerOptions, transports } from 'winston';
import 'winston-daily-rotate-file';

const { combine, colorize, errors, json, ms, printf, timestamp } = format;

const colorizer = (level: string, message: string) => {
  return colorize().colorize(level, message);
};

export const WinstonLoggerOptions: LoggerOptions = {
  level: 'info',
  transports: [
    new transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      format: combine(timestamp(), ms(), errors({ stack: true }), json()),
    }),
    // Add console transport only if not in production
    ...(process.env.NODE_ENV === 'production'
      ? []
      : [
          new transports.Console({
            format: combine(
              timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              ms(),
              errors({ stack: true }),
              printf(({ timestamp, level, message, context, ms, stack }) => {
                if (stack && stack[0]) {
                  return `${timestamp} - ${colorizer(level, level.toUpperCase())} [${colorizer('verbose', context)}]: ${colorizer(level, message)} ${colorizer('silly', ms)}\n${colorizer(level, stack)}`;
                }
                return `${timestamp} - ${colorizer(level, level.toUpperCase())} [${colorizer('verbose', context)}]: ${colorizer(level, message)} ${colorizer('silly', ms)}`;
              }),
              // colorize({ all: true }), # To colorize entire line
            ),
          }),
        ]),
  ],
};
