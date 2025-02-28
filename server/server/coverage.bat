cd ./server
cargo llvm-cov nextest --lcov --output-path ./lcov.info
cd ../
