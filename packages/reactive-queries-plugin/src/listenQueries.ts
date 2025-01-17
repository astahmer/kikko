import { IDbState, runQueries } from "@kikko-land/kikko";
import { ISqlAdapter } from "@kikko-land/sql";

import { IMessage } from "./getBroadcastCh";
import { getReactiveState } from "./utils";

export const listenQueries = <D extends Record<string, unknown>>(
  db: IDbState,
  queries: ISqlAdapter[],
  subscriber: (evs: D[][]) => void
): (() => void) => {
  const { rEventsCh } = getReactiveState(db);

  const readingTables = new Set(
    queries
      .map((q) => q.toSql())
      .flatMap((q) => q.tables)
      .map((t) => t.name)
  );

  let currentChannelUnsub: (() => void) | undefined;

  const runAndEmitQuery = async () => {
    subscriber(await runQueries<D>(db, queries));
  };

  const chChangeUnsub = rEventsCh.subscribe((ch) => {
    if (currentChannelUnsub) currentChannelUnsub();

    if (!ch) return;

    const func = ({ changesInTables }: IMessage) => {
      if (!changesInTables.some((table) => readingTables.has(table))) return;
      void runAndEmitQuery();
    };

    ch.addEventListener(func);

    currentChannelUnsub = () => {
      ch.removeEventListener(func);
    };
  });

  // Emit first value
  void runAndEmitQuery();

  const unsubRunningState = db.sharedState.runningState.subscribe((v) => {
    queueMicrotask(() => {
      if (v === "stopping" || v === "stopped") {
        unsubAll();
      }
    });
  });

  const unsubAll = () => {
    unsubRunningState();
    currentChannelUnsub?.();
    chChangeUnsub();
  };

  return unsubAll;
};
