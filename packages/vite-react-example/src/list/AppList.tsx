import "../builder-examples";

import { absurdWebBackend } from "@kikko-land/absurd-web-backend";
import {
  DbProvider,
  EnsureDbLoaded,
  IInitDbClientConfig,
  migrationsPlugin,
  reactiveQueriesPlugin,
} from "@kikko-land/react";
import absurdSqlWasmUrl from "@kikko-land/sql.js/dist/sql-wasm.wasm?url";
import { waSqliteWebBackend } from "@kikko-land/wa-sqlite-web-backend";
import { useMemo } from "react";
import { useLocation } from "react-use";
import sqlWasmUrl from "wa-sqlite/dist/wa-sqlite-async.wasm?url";

import { createNotesTableMigration } from "../migrations/createNotesTable";
import { List } from "./List";

const buildConfig = (config: IBackendConfig): IInitDbClientConfig => {
  return {
    dbName: `helloWorld-${config.type}`,
    dbBackend:
      config.type === "absurd"
        ? absurdWebBackend({
            wasmUrl: absurdSqlWasmUrl,
            pageSize: 32 * 1024,
            cacheSize: -5000,
          })
        : waSqliteWebBackend({
            wasmUrl: sqlWasmUrl,
            pageSize: 32 * 1024,
            cacheSize: -5000,
            vfs: config.vfs,
          }),
    plugins: [
      reactiveQueriesPlugin(),
      migrationsPlugin({
        migrations: [createNotesTableMigration],
      }),
    ],
  };
};

export type IBackendConfig =
  | { type: "absurd" }
  | { type: "wa-sqlite"; vfs: "atomic" | "batch-atomic" | "minimal" };

function parseQuery(queryString: string) {
  const query: Record<string, string> = {};
  const pairs = (queryString[0] === "?"
    ? queryString.substr(1)
    : queryString
  ).split("&");

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split("=");

    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
  }
  return query;
}

export const backendOptions = {
  absurd: { type: "absurd" },
  waMinimal: {
    type: "wa-sqlite",
    vfs: "minimal",
  },
} as const;

export const AppList = () => {
  const backendName = (parseQuery(useLocation().search || "")["backend"] ||
    "absurd") as keyof typeof backendOptions;

  const config = useMemo(() => {
    return buildConfig(backendOptions[backendName || "absurd"]);
  }, [backendName]);

  return (
    <DbProvider config={config}>
      <EnsureDbLoaded fallback={<div>Loading db...</div>}>
        <List />
      </EnsureDbLoaded>
    </DbProvider>
  );
};
