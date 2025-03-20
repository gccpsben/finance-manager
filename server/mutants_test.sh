# We use only 1 thread because the tests are done against a real database.
# the test will read TEST_DB_URL_0 for each test.
# If multiple threads are used, TEST_DB_URL_1, TEST_DB_URL_2 etc... are used.
cargo mutants --test-tool=nextest --in-place -- --test-threads=1