import { Sql } from "@trong-orm/sql";

export enum TokenType {
  Binary = "Binary",
  Unary = "Unary",
  Alias = "Alias",
  Compound = "Compound",
  Select = "Select",
  Update = "Update",
  Delete = "Delete",
  Values = "Values",
  OrderTerm = "OrderTerm",
  LimitOffsetTerm = "LimitOffsetTerm",
  RawSql = "RawSql",
  CompoundOperator = "CompoundOperator",
  CTE = "CTE",
}

export interface IBaseToken<T extends TokenType = TokenType> {
  type: T;
  toSql(): Sql;
}

export const isToken = (t: unknown): t is IBaseToken => {
  return (
    t !== null &&
    typeof t === "object" &&
    "type" in t &&
    "toSql" in t &&
    Object.values(TokenType).includes((t as IBaseToken).type)
  );
};

export function assertUnreachable(x: never): never {
  throw new Error(`Didn't expect to get here: ${JSON.stringify(x)}`);
}
