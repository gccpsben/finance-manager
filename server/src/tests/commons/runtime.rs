use crate::states::database_states::DatabaseStates;
use actix_test::TestServer;

pub struct TestRuntime {
    pub server: TestServer,
    pub states: DatabaseStates,
}

impl TestRuntime {
    pub fn new(server: TestServer, states: DatabaseStates) -> Self {
        Self { server, states }
    }
}
