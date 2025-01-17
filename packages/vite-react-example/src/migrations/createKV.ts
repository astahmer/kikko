import { IMigration, runQuery, sql } from "@kikko-land/react";

export const createKVMigration: IMigration = {
  up: async (db) => {
    await runQuery(
      db,
      sql`
      CREATE TABLE kv (key TEXT, value TEXT);
      `
    );
  },
  id: 19,
  name: "createKV",
};
