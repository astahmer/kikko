import { initBackend } from "absurd-sql/dist/indexeddb-main-thread";
import {
  filter,
  first,
  lastValueFrom,
  Observable,
  ReplaySubject,
  share,
  Subject,
  takeUntil,
} from "rxjs";
import { IOutputWorkerMessage, IInputWorkerMessage } from "../worker/types";
import { getBroadcastCh$ } from "./utils";
import { IDbState, ITrongEvents } from "./types";
import { nanoid } from "nanoid";
import { createNanoEvents } from "./createNanoEvents";

export type IInitDbConfig = {
  dbName: string;
  worker: Worker;
  wasmUrl: string;
  plugins?: ((state: IDbState) => IDbState)[];
};

export const initDb = async ({
  dbName,
  worker,
  wasmUrl,
  plugins,
}: IInitDbConfig): Promise<IDbState> => {
  initBackend(worker);

  const stop$ = new Subject<void>();

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
    worker.addEventListener("message", sub);

    return () => {
      worker.removeEventListener("message", sub);
    };
  }).pipe(
    share({
      connector: () => new ReplaySubject(20),
      resetOnRefCountZero: false,
    }),
    takeUntil(stop$)
  );

  const messagesToWorker$ = new Subject<IInputWorkerMessage>();
  messagesToWorker$.pipe(takeUntil(stop$)).subscribe((mes) => {
    worker.postMessage(mes);
  });

  messagesToWorker$.next({
    type: "initialize",
    dbName: dbName,
    wasmUrl: wasmUrl,
  });

  await lastValueFrom(
    messagesFromWorker$.pipe(
      filter((ev) => ev.type === "initialized"),
      first(),
      takeUntil(stop$)
    )
  );

  let state: IDbState = {
    sharedState: {
      clientId: nanoid(),
      messagesFromWorker$,
      messagesToWorker$,
      stop$,
      eventsCh$: getBroadcastCh$(dbName + "-tableContentChanges", stop$),
      isStopped: false,
      dbName,
      eventsEmitter: createNanoEvents<ITrongEvents>(),
    },
  };

  for (const plugin of plugins || []) {
    state = plugin(state);
  }

  await state.sharedState.eventsEmitter.emit("initialized");

  return state;
};

export const stopDb = (state: IDbState) => {
  state.sharedState.stop$.next();

  state.sharedState.isStopped = true;
};
