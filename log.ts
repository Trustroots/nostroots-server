import { logPackage } from "./deps.ts";

logPackage.setup({
  handlers: {
    console: new logPackage.ConsoleHandler("DEBUG", {
      formatter: function (record) {
        const argsString =
          record.args.length > 0 ? ` ${JSON.stringify(record.args)}` : "";
        return `${record.datetime.toISOString()} [${record.levelName}] ${
          record.msg
        } ${argsString}`;
      },

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
