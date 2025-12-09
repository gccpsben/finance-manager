echo "NOTE: This script uses SEAORM_GEN_DB_URL for the generation url."
sea-orm-cli generate entity -o ./src/entities/ -u $SEAORM_GEN_DB_URL