from project.migrate import Schema, Blueprint


async def up(schema: type[Schema]) -> None:
    def builder(table: Blueprint) -> None:
        table.id()
        table.string("uuid", 64).unique().not_null()
        table.bigint("test_id").not_null().references("tests", "id")
        table.text("text").not_null()
        table.integer("points").not_null().default("1")
        table.integer("order_num").not_null().default("1")
        table.timestamp("created_at").default("CURRENT_TIMESTAMP")

    await schema.create("questions", builder)
