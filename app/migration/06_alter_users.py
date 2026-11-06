from project.migrate import Schema, Blueprint


async def up(schema: type[Schema]) -> None:
    def builder(table: Blueprint) -> None:
        table.string("name", 255).not_null().default("'User'")
        table.text("avatar")
        table.string("role", 32).not_null().default("'student'")
        table.timestamp("updated_at").default("CURRENT_TIMESTAMP")

    await schema.table("users", builder)
