import { Observable } from "rxjs";

import { INotifyChannel } from "./getBroadcastCh";

declare module "@kikko-land/core" {
  export interface ISharedDbState {
    reactiveQueriesState?: {
      eventsCh$: Observable<INotifyChannel>;
    };
  }
}
