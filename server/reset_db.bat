cd migration
cargo run -- --database-url sqlite://../db.db?mode=rwc
cd ../server
sea-orm-cli generate entity --database-url sqlite://../db.db?mode=rwc --output-dir ./src/entities