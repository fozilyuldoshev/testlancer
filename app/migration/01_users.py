from project.migrate import Schema, Blueprint


async def up(schema: type[Schema]) -> None:
    def builder(table: Blueprint) -> None:
        table.id()
        table.string("uuid", 64).unique().not_null()
        table.string("email").unique().not_null()
        table.timestamp("created_at").default("CURRENT_TIMESTAMP")

    await schema.create("users", builder)
