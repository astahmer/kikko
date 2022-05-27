import { nanoid } from "nanoid";
import { IDbState } from "./client/types";
import { Sql } from "./Sql";

type IBaseCommand = {
  suppressLog?: boolean;
};

export type IStartTransactionCommand = IBaseCommand & {
  type: "startTransaction";
  transactionId: string;
  commandId: string;
};
export type ICommitTransactionCommand = IBaseCommand & {
  type: "commitTransaction";
  transactionId: string;
  commandId: string;
};
export type IRollbackTransactionCommand = IBaseCommand & {
  type: "rollbackTransaction";
  transactionId: string;
  commandId: string;
};

type ITransactionCommand =
  | IStartTransactionCommand
  | ICommitTransactionCommand
  | IRollbackTransactionCommand;

export type IExecQueriesCommand = IBaseCommand & {
  type: "runQueries";
  queries: Sql[];
  spawnTransaction?: boolean;
  transactionId?: string;
  commandId: string;
};

export type ICommand =
  | IStartTransactionCommand
  | IRollbackTransactionCommand
  | IExecQueriesCommand
  | ICommitTransactionCommand;

export const buildTransactionCommand = (
  state: IDbState,
  type: ITransactionCommand["type"]
): ITransactionCommand => {
  if (!state.transaction) {
    throw new Error("Transaction id not set in state");
  }

  return {
    type,
    transactionId: state.transaction.id,
    commandId: nanoid(),
  };
};

export const buildRunQueriesCommand = (
  state: IDbState,
  queries: Sql[]
): IExecQueriesCommand => {
  return {
    type: "runQueries",
    queries,
    spawnTransaction: queries.length > 1 && !state.transaction,
    transactionId: state.transaction?.id,
    commandId: nanoid(),
  };
};