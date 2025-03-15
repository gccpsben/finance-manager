use crate::env::AppEnv;
use crate::env::EnvLogMode;
use tracing::{level_filters::LevelFilter, Level};
use tracing_subscriber::{filter, fmt::Layer, layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Debug)]
pub enum EnvInitLoggerErrors {
    #[allow(unused)]
    IOError(std::io::Error),
    #[allow(unused)]
    TryInitError(tracing_subscriber::util::TryInitError),
}

impl From<std::io::Error> for EnvInitLoggerErrors {
    fn from(error: std::io::Error) -> Self {
        EnvInitLoggerErrors::IOError(error)
    }
}

impl From<tracing_subscriber::util::TryInitError> for EnvInitLoggerErrors {
    fn from(error: tracing_subscriber::util::TryInitError) -> Self {
        EnvInitLoggerErrors::TryInitError(error)
    }
}

impl AppEnv {
    pub fn init_logger(&self) -> Result<(), EnvInitLoggerErrors> {
        let file_appender_path = match &self.logging.log_mode {
            EnvLogMode::File { path } | EnvLogMode::Both { path } => Some(path),
            EnvLogMode::Console => None,
        };

        // Create a file logger if needed
        let file_appender = file_appender_path.map(|path| {
            Layer::new().with_ansi(false).with_writer(
                std::fs::OpenOptions::new()
                    .append(true)
                    .create(true)
                    .open(path)
                    .unwrap(),
            )
        });

        let stdout_layer = Layer::new();

        let filter = filter::Targets::new()
            .with_default(Level::INFO)
            .with_target("sqlx::postgres::notice", LevelFilter::OFF)
            .with_target("sqlx::query", LevelFilter::OFF);

        let subscriber = tracing_subscriber::registry()
            .with(filter)
            .with(stdout_layer)
            .with(file_appender);

        // Initialize the subscriber
        Ok(subscriber.try_init()?)
    }
}
