from __future__ import annotations

import os

from pymongo import MongoClient


def main() -> None:
    mongo_url = (
        os.environ.get("MONGO_URL")
        or os.environ.get("MONGODB_URL")
        or os.environ.get("MONGODB_URI")
        or "mongodb://localhost:27017/hispaloshop"
    )
    db_name = os.environ.get("MONGO_DB_NAME", "hispaloshop")

    client = MongoClient(mongo_url)
    db = client[db_name]

    for collection_name in ["hi_coin_balances", "hi_coin_transactions"]:
        if collection_name in db.list_collection_names():
            db.drop_collection(collection_name)
            print(f"dropped={collection_name}")
        else:
            print(f"missing={collection_name}")


if __name__ == "__main__":
    main()
