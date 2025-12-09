# If multiple threads are used, TEST_DB_URL_1, TEST_DB_URL_2 etc... are used.
cargo llvm-cov nextest --test-threads=12;

# output lcov report without running tests.
cargo llvm-cov report --lcov --output-path ./lcov.info;