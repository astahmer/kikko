import { IPrimitiveValue, ISqlAdapter, sql } from "@trong-orm/sql";

import { IBaseToken, TokenType } from "../../types";
import {
  except,
  ICompoundState,
  intersect,
  union,
  unionAll,
  withoutCompound,
} from "../compounds";
import { ICTEState, With, withoutWith, withRecursive } from "../cte";
import {
  buildInitialLimitOffsetState,
  ILimitOffsetState,
  limit,
  offset,
  withoutLimit,
  withoutOffset,
} from "../limitOffset";
import { IOrderState, orderBy, withoutOrder } from "../order";

export interface IValuesStatement
  extends IBaseToken<TokenType.Values>,
    IOrderState,
    ICompoundState,
    ILimitOffsetState,
    ICTEState {
  values: (IBaseToken | ISqlAdapter | IPrimitiveValue)[][];
}

export const values = (
  ...vals: (IBaseToken | ISqlAdapter | IPrimitiveValue)[][]
): IValuesStatement => {
  return {
    type: TokenType.Values,
    values: vals,
    orderBy,
    withoutOrder,
    compoundValues: [],
    limitOffsetValue: buildInitialLimitOffsetState(),

    union,
    unionAll,
    intersect,
    except,
    withoutCompound,

    limit,
    withoutLimit,
    offset,
    withoutOffset,

    withoutWith,
    withRecursive,
    with: With,
    toSql() {
      return sql.join(
        [
          this.cteValue ? this.cteValue : null,
          sql`VALUES ${sql.join(
            this.values.map((val) => sql`(${sql.join(val)})`)
          )}`,
          this.compoundValues.length > 0
            ? sql.join(this.compoundValues, " ")
            : null,
          this.orderByValue ? this.orderByValue : null,
          this.limitOffsetValue.toSql().isEmpty ? null : this.limitOffsetValue,
        ].filter((v) => v),
        " "
      );
    },
  };
};

export const isValues = (val: unknown): val is IValuesStatement => {
  return (
    val !== null &&
    typeof val === "object" &&
    (val as IValuesStatement).type === TokenType.Values
  );
};