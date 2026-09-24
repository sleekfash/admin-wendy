import type { Database } from "@/integrations/supabase/types";

type GeneratedTables = Database["public"]["Tables"];

type AddFields<
  Table extends { Row: object; Insert: object; Update: object },
  RowFields extends object,
  WriteFields extends object,
> = Omit<Table, "Row" | "Insert" | "Update"> & {
  Row: Table["Row"] & RowFields;
  Insert: Table["Insert"] & WriteFields;
  Update: Table["Update"] & Partial<WriteFields>;
};

type DepositPercentRow = { deposit_percent: number | null };
type DepositPercentWrite = { deposit_percent?: number | null };
type MultipleRow = { allow_multiple: boolean };
type MultipleWrite = { allow_multiple?: boolean };

/** App-owned overlay for additive columns not yet present in Lovable's generated file. */
export type AppDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<
      GeneratedTables,
      "products" | "product_option_groups" | "orders" | "order_items"
    > & {
      products: AddFields<GeneratedTables["products"], DepositPercentRow, DepositPercentWrite>;
      product_option_groups: AddFields<
        GeneratedTables["product_option_groups"],
        MultipleRow,
        MultipleWrite
      >;
      orders: AddFields<GeneratedTables["orders"], DepositPercentRow, DepositPercentWrite>;
      order_items: AddFields<
        GeneratedTables["order_items"],
        DepositPercentRow,
        DepositPercentWrite
      >;
    };
  };
};
