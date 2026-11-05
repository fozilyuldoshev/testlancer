import logging
import atexit
import contextlib
from pathlib import Path
from queue import Queue
from logging.handlers import RotatingFileHandler, QueueHandler, QueueListener


class Log:
    def __init__(self) -> None:
        self.dir = Path(__file__).resolve().parent.parent / "logs"
        self.dir.mkdir(exist_ok=True)
        self.logger = logging.getLogger("project")
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False
        queue: Queue = Queue(-1)
        queue_handler = QueueHandler(queue)
        self.logger.addHandler(queue_handler)
        formatter = logging.Formatter("%(asctime)s | %(filename)s:%(lineno)d | %(message)s")
        file_handler = RotatingFileHandler(
            self.dir / "project.log",
            maxBytes=10 * 1024 * 1024,
            backupCount=10,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
        self.listener = QueueListener(queue, file_handler, respect_handler_level=True)
        self.listener.start()
        atexit.register(self.stop)

    def stop(self) -> None:
        with contextlib.suppress(Exception):
            self.listener.stop()

    def info(self, msg: str, *args, **kwargs) -> None:
        self.logger.info(msg, *args, **kwargs, stacklevel=2)

    def warning(self, msg: str, *args, **kwargs) -> None:
        self.logger.warning(msg, *args, **kwargs, stacklevel=2)

    def error(self, msg: str, *args, **kwargs) -> None:
        self.logger.error(msg, *args, **kwargs, stacklevel=2)

    def critical(self, msg: str, *args, **kwargs) -> None:
        self.logger.critical(msg, *args, **kwargs, stacklevel=2)

    def exception(self, msg: str, *args, **kwargs) -> None:
        self.logger.exception(msg, *args, **kwargs, stacklevel=2)


log = Log()
