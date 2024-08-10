import { logPackage } from "./deps.ts";

logPackage.setup({
  handlers: {
    console: new logPackage.ConsoleHandler("DEBUG", {
      formatter: (record) =>
        `${record.datetime.toISOString()} [${record.levelName}] ${
          record.msg
        } ${JSON.stringify(record.args)}`,
      useColors: true,
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

export const log = logPackage.getLogger();
