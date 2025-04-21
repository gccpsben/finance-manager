use crate::{
    date::ParseISO8601Errors,
    extended_models::{account::AccountId, currency::CurrencyId, txn::TxnId, txn_tag::TxnTagId},
    routes,
};
use actix_http::StatusCode;
use actix_web::{
    body::{BoxBody, MessageBody},
    dev::{Service, ServiceFactory, ServiceRequest, ServiceResponse},
    App, Error, HttpResponse,
};
use futures::FutureExt;
use sea_orm::DbErr;
use thiserror::Error;
use tracing::error;

#[derive(Error, Debug)]
pub enum EndpointsErrors {
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Error querying database.")]
    DbErr(#[from] DbErr),
    #[error("Cannot find currency {}", .0.0)]
    CurrencyNotFound(CurrencyId),
    #[error("{0} is not a valid decimal value.")]
    InvalidDecimalValue(String),
    #[error("Decimal encountered overflow or underflow.")]
    OverflowOrUnderflow,
    #[error("Invalid uuid: {0}")]
    InvalidUUID(String),
    #[error("Invalid ISO8601 date: {0}")]
    ParseISO8601Errors(#[from] ParseISO8601Errors),
    #[error("Cyclic Ref Amount Currency: {0}")]
    CyclicRefAmountCurrency(uuid::Uuid),
    #[error("If {left_prop_name} is given, {right_prop_name} must also be given.")]
    MissingArgPair {
        left_prop_name: String,
        right_prop_name: String,
    },
    #[error("At most 1 base currency is allowed for each user.")]
    RepeatedBaseCurrency,
    #[error("Internal server error: {msg}")]
    InternalServerError { msg: String },
    #[error("Missing username.")]
    MissingUsername,
    #[error("Missing password.")]
    MissingPassword,
    #[error("The given account: {} is not found.", .0.0)]
    AccountNotFound(AccountId),
    #[error("The given txn tag: {} is not found.", .0.0)]
    TxnTagNotFound(TxnTagId),
    #[error("The given request contains repeated txn tags with id={}", .0.0)]
    RepeatedTxnTags(TxnTagId),
    #[error("The given txn: {} is not found.", .0.0)]
    TxnNotFound(TxnId),
}

pub fn parse_uuid(value: &str) -> Result<uuid::Uuid, EndpointsErrors> {
    <uuid::Uuid as std::str::FromStr>::from_str(value)
        .map_err(|_| EndpointsErrors::InvalidUUID(value.to_string()))
}

impl actix_web::ResponseError for EndpointsErrors {
    fn error_response(&self) -> HttpResponse<BoxBody> {
        HttpResponse::build(self.status_code()).body(self.to_string())
    }

    fn status_code(&self) -> StatusCode {
        type E = EndpointsErrors;
        match self {
            E::DbErr(_db_err) => StatusCode::INTERNAL_SERVER_ERROR,
            E::InternalServerError { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            E::CurrencyNotFound(_currency_id) => StatusCode::NOT_FOUND,
            E::AccountNotFound(_account_id) => StatusCode::NOT_FOUND,
            E::Unauthorized => StatusCode::UNAUTHORIZED,
            E::ParseISO8601Errors(_parse_iso8601_errors) => StatusCode::BAD_REQUEST,
            E::CyclicRefAmountCurrency(_uuid) => StatusCode::BAD_REQUEST,
            E::RepeatedBaseCurrency => StatusCode::BAD_REQUEST,
            E::MissingArgPair { .. } => StatusCode::BAD_REQUEST,
            E::InvalidDecimalValue(_) => StatusCode::BAD_REQUEST,
            E::OverflowOrUnderflow => StatusCode::BAD_REQUEST,
            E::InvalidUUID(_error) => StatusCode::BAD_REQUEST,
            E::MissingUsername => StatusCode::BAD_REQUEST,
            E::MissingPassword => StatusCode::BAD_REQUEST,
            E::RepeatedTxnTags(_) => StatusCode::BAD_REQUEST,
            E::TxnTagNotFound(_id) => StatusCode::NOT_FOUND,
            E::TxnNotFound(_id) => StatusCode::NOT_FOUND
        }
    }
}

pub fn apply_endpoints(
    app: App<
        impl ServiceFactory<
            ServiceRequest,
            Response = ServiceResponse<impl MessageBody>,
            Config = (),
            InitError = (),
            Error = Error,
        >,
    >,
) -> App<
    impl ServiceFactory<
        ServiceRequest,
        Response = ServiceResponse<impl MessageBody>,
        Config = (),
        InitError = (),
        Error = Error,
    >,
> {
    let app = app.wrap_fn(|req, srv| {
        srv.call(req).map(|res| {
            if let Ok(ref res) = res {
                if matches!(res.status(), StatusCode::INTERNAL_SERVER_ERROR) {
                    error!(
                        "Server encountered INTERVAL_SERVER_ERROR: {:?}",
                        res.response()
                    );
                    #[cfg(test)]
                    eprintln!(
                        "Server encountered INTERVAL_SERVER_ERROR: {:?}",
                        res.response()
                    );
                }
            }
            res
        })
    });

    let mut app = app
        .route(
            "/api/v1/auth/login",
            actix_web::web::post().to(routes::users::login::handler),
        )
        .route(
            "/api/v1/auth/users",
            actix_web::web::post().to(routes::users::register::handler),
        )
        .route(
            "/api/v1/accounts",
            actix_web::web::post().to(routes::accounts::post_account::handler),
        )
        .route(
            "/api/v1/currencies",
            actix_web::web::post().to(routes::currencies::post_currency::handler),
        )
        .route(
            "/api/v1/currencies",
            actix_web::web::get().to(routes::currencies::get_currency::handler),
        )
        .route(
            "/api/v1/currencyRateDatums",
            actix_web::web::post()
                .to(routes::currency_rate_datums::post_currency_rate_datum::handler),
        )
        .route(
            "/api/v1/txnTags",
            actix_web::web::get().to(routes::txn_tags::get_tags::handler),
        )
        .route(
            "/api/v1/txnTags",
            actix_web::web::post().to(routes::txn_tags::create_tag::handler),
        )
        .route(
            "/api/v1/accounts",
            actix_web::web::get().to(routes::accounts::get_account::handler),
        )
        .route(
            "/api/v1/txns",
            actix_web::web::post().to(routes::txns::post_txns::handler),
        )
        .route(
            "/api/v1/txns",
            actix_web::web::get().to(routes::txns::get_txns::handler),
        )
        .route(
            "/api/v1/txn",
            actix_web::web::get().to(routes::txns::get_txn::handler),
        );

    #[cfg(debug_assertions)]
    {
        app = app.service(routes::dev::dev_test::handler);
    }

    app
}
