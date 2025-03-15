# We use only 1 thread because the tests are done against a real database.
cargo llvm-cov nextest --lcov --output-path ./lcov.info --test-threads=1