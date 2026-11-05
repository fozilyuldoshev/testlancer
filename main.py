import argparse
from cryptography.fernet import Fernet
from project.http import http


class App:
    def __init__(self) -> None:
        self.parser = argparse.ArgumentParser()
        self.parser.add_argument("command", choices=["http", "secret-key"])

    def run(self) -> None:
        args = self.parser.parse_args()

        if args.command == "http":
            http.run()
        elif args.command == "secret-key":
            print(Fernet.generate_key().decode())


if __name__ == "__main__":
    app = App()
    app.run()
