ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_signed_type_check" CHECK ((
        ("ledger_entries"."type" = 'SYSTEM_MINT' and "ledger_entries"."amount" > 0)
        or ("ledger_entries"."type" = 'ORDER_RESERVE' and "ledger_entries"."amount" < 0)
        or ("ledger_entries"."type" = 'ORDER_RELEASE' and "ledger_entries"."amount" > 0)
        or ("ledger_entries"."type" = 'TRADE_SETTLEMENT' and "ledger_entries"."amount" <> 0)
        or ("ledger_entries"."type" = 'FEE' and "ledger_entries"."amount" < 0)
      ));