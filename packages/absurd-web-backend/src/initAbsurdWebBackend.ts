import { IDbBackend, IQuery } from "@trong-orm/core";
import { initBackend } from "absurd-sql/dist/indexeddb-main-thread";
import {
  filter,
  first,
  firstValueFrom,
  Observable,
  ReplaySubject,
  share,
  Subject,
  takeUntil,
} from "rxjs";

import { buildRunQueriesCommand } from "./commands";
import { runWorkerCommand } from "./runWorkerCommand";
import { IBackendState } from "./types";
import { IInputWorkerMessage, IOutputWorkerMessage } from "./worker/types";

export const initAbsurdWebBackend =
  ({
    worker,
    wasmUrl,
    queryTimeout,
  }: {
    worker: () => Worker;
    wasmUrl: string;
    queryTimeout?: number;
  }) =>
  ({
    dbName,
    stopped$,
  }: {
    dbName: string;
    stopped$: Observable<void>;
  }): IDbBackend => {
    const initializedWorker = worker();
    const messagesToWorker$ = new Subject<IInputWorkerMessage>();
    messagesToWorker$.pipe(takeUntil(stopped$)).subscribe((mes) => {
      initializedWorker.postMessage(mes);
    });

    const messagesFromWorker$ = new Observable<IOutputWorkerMessage>((obs) => {
      const sub = (ev: MessageEvent<IOutputWorkerMessage>) => {
        // console.log(
        //   `[DB][${
        //     ev.data.type === 'response' && ev.data.data.commandId
        //   }] new message from worker`,
        //   ev.data,
        // );
        obs.next(ev.data);
      };
      initializedWorker.addEventListener("message", sub);

      return () => {
        initializedWorker.removeEventListener("message", sub);
      };
    }).pipe(
      share({
        connector: () => new ReplaySubject(20),
        resetOnRefCountZero: false,
      }),
      takeUntil(stopped$)
    );

    stopped$.pipe(first()).subscribe(() => {
      initializedWorker.terminate();
    });

    const state: IBackendState = {
      messagesToWorker$,
      messagesFromWorker$,
      stop$: stopped$,
      queryTimeout: queryTimeout || 30_000,
    };

    return {
      async initialize() {
        initBackend(initializedWorker);

        const initPromise = firstValueFrom(
          messagesFromWorker$.pipe(
            filter((ev) => ev.type === "initialized"),
            takeUntil(stopped$)
          )
        );

        messagesToWorker$.next({
          type: "initialize",
          dbName: dbName,
          wasmUrl: wasmUrl,
        });

        await initPromise;
      },
      execQueries(queries: IQuery[], opts) {
        return runWorkerCommand(state, buildRunQueriesCommand(queries, opts));
      },
    };
  };