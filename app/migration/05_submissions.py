from project.migrate import Schema, Blueprint


async def up(schema: type[Schema]) -> None:
    def builder(table: Blueprint) -> None:
        table.id()
        table.string("uuid", 64).unique().not_null()
        table.bigint("test_id").not_null().references("tests", "id")
        table.bigint("user_id").not_null().references("users", "id")
        table.integer("score").not_null().default("0")
        table.integer("total_points").not_null().default("0")
        table.float("percentage").not_null().default("0.0")
        table.integer("time_spent").not_null().default("0")
        table.json("answers")
        table.boolean("passed").not_null().default("FALSE")
        table.timestamp("created_at").default("CURRENT_TIMESTAMP")

    await schema.create("submissions", builder)
