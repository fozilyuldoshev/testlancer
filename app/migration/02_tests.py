from project.migrate import Schema, Blueprint


async def up(schema: type[Schema]) -> None:
    def builder(table: Blueprint) -> None:
        table.id()
        table.string("uuid", 64).unique().not_null()
        table.bigint("user_id").not_null().references("users", "id")
        table.string("title", 255).not_null()
        table.string("subject", 255).not_null().default("'General'")
        table.text("description")
        table.integer("duration").not_null().default("30")
        table.integer("passing_score").not_null().default("70")
        table.string("status", 32).not_null().default("'Active'")
        table.timestamp("created_at").default("CURRENT_TIMESTAMP")
        table.timestamp("updated_at").default("CURRENT_TIMESTAMP")

    await schema.create("tests", builder)
