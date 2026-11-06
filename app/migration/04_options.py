from project.migrate import Schema, Blueprint


async def up(schema: type[Schema]) -> None:
    def builder(table: Blueprint) -> None:
        table.id()
        table.bigint("question_id").not_null().references("questions", "id")
        table.text("text").not_null()
        table.boolean("is_correct").not_null().default("FALSE")
        table.integer("order_num").not_null().default("1")

    await schema.create("options", builder)
