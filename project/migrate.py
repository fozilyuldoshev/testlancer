import os
import importlib
from typing import Callable, List, Any, Optional
from project.db import db
from project.log import log


class Column:
    def __init__(self, name: str, type: str) -> None:
        self.name = name
        self.type = type
        self._primary = False
        self._not_null = False
        self._unique = False
        self._default: Optional[str] = None
        self._foreign: Optional[str] = None

    def primary(self) -> 'Column':
        self._primary = True
        return self

    def not_null(self) -> 'Column':
        self._not_null = True
        return self

    def unique(self) -> 'Column':
        self._unique = True
        return self

    def default(self, value: str) -> 'Column':
        self._default = value
        return self

    def references(self, table: str, column: str = "id", update: str = "CASCADE", delete: str = "CASCADE") -> 'Column':
        self._foreign = f"REFERENCES {table}({column}) ON UPDATE {update} ON DELETE {delete}"
        return self

    def compile(self) -> str:
        sql = f"{self.name} {self.type}"
        if self._primary: sql += " PRIMARY KEY"
        if self._unique: sql += " UNIQUE"
        if self._not_null: sql += " NOT NULL"
        if self._default is not None: sql += f" DEFAULT {self._default}"
        if self._foreign: sql += f" {self._foreign}"
        return sql


class Blueprint:
    def __init__(self, name: str) -> None:
        self.name = name
        self.columns: List[Column] = []
        self.constraints: List[str] = []

    def add_column(self, name: str, type: str) -> Column:
        column = Column(name, type)
        self.columns.append(column)
        return column

    def id(self) -> Column:
        return self.add_column("id", "BIGSERIAL").primary()

    def bigint(self, name: str) -> Column:
        return self.add_column(name, "BIGINT")

    def integer(self, name: str) -> Column:
        return self.add_column(name, "INTEGER")

    def float(self, name: str) -> Column:
        return self.add_column(name, "DOUBLE PRECISION")

    def text(self, name: str) -> Column:
        return self.add_column(name, "TEXT")

    def json(self, name: str) -> Column:
        return self.add_column(name, "JSONB")

    def uuid(self, name: str) -> Column:
        return self.add_column(name, "UUID")

    def string(self, name: str, length: int = 255) -> Column:
        return self.add_column(name, f"VARCHAR({length})")

    def boolean(self, name: str) -> Column:
        return self.add_column(name, "BOOLEAN")

    def timestamp(self, name: str) -> Column:
        return self.add_column(name, "TIMESTAMP")

    def unique_together(self, *cols: str) -> None:
        self.constraints.append(f"UNIQUE ({', '.join(cols)})")

    def compile(self) -> str:
        defs = [c.compile() for c in self.columns] + self.constraints
        body = ",\n    ".join(defs)
        return f"CREATE TABLE IF NOT EXISTS {self.name} (\n    {body}\n);"


class Schema:
    @staticmethod
    async def create(name: str, callback: Callable[[Blueprint], None]) -> None:
        blueprint = Blueprint(name)
        callback(blueprint)
        result = await db.execute(blueprint.compile())
        if not result:
            raise Exception(f"Schema error ({name})")


class Migrate:
    @staticmethod
    async def run() -> None:
        try:
            result = await db.execute(
                "CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL)"
            )
            if not result:
                raise Exception(f"Migrations table create error")
            path = "app/migration"
            if not os.path.exists(path):
                return
            files = sorted(f for f in os.listdir(path) if f.endswith(".py") and f != "__init__.py")
            for file in files:
                name = file[:-3]
                check = await db.fetchrow("SELECT id FROM migrations WHERE name = $1", name)
                if not check:
                    module = importlib.import_module(f"app.migration.{name}")
                    up: Callable[[Any], Any] = getattr(module, "up")
                    await up(Schema)
                    result = await db.execute("INSERT INTO migrations (name) VALUES ($1)", name)
                    if not result:
                        raise Exception(f"Migrate insert error")
        except Exception:
            log.exception(f"Migrate error")
            raise Exception(f"Migrate error")


migrate = Migrate()
