use crate::{date::ParseISO8601Errors, extended_models::currency::CurrencyId, routes};
use actix_http::StatusCode;
use actix_web::{
    body::{BoxBody, MessageBody},
    dev::{ServiceFactory, ServiceRequest, ServiceResponse},
    App, Error, HttpResponse,
};
use sea_orm::DbErr;
use thiserror::Error;

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
    let mut app = app
        .service(routes::users::login::handler)
        .service(routes::users::register::handler)
        .service(routes::accounts::post_account::handler)
        .service(routes::currencies::post_currency::handler)
        .service(routes::currencies::get_currency::handler)
        .service(routes::currency_rate_datums::post_currency_rate_datum::handler)
        .service(routes::txn_tags::get_tags::handler)
        .service(routes::txn_tags::create_tag::handler)
        .service(routes::accounts::get_account::handler);

    #[cfg(debug_assertions)]
    {
        app = app.service(routes::dev::dev_test::handler);
    }

    app
}
